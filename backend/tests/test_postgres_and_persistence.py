"""
FraudScope AI — Persistence & PostgreSQL Compatibility Tests
===========================================================
Validates:
1. Large recommended_review_action text persistence without character truncation.
2. Rule-triggered ad scanning and persistence with evidence & alerts.
3. Idempotent database seeding for demonstration data, cases, and settings.
4. Dashboard stats calculation across demo and live scan provenance.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.models import Advertisement, AnalysisResult, Evidence, Alert, Case, SystemSetting
from app.services.seed_data import seed_database_if_empty

client = TestClient(app)


def test_analysis_recommended_action_text_length():
    """Verify that recommended_review_action column supports strings longer than 128 chars."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        ad = Advertisement(
            custom_id=f"AD-TEST-LEN-{uid}",
            original_text="Test advertisement with lengthy review action text.",
            normalized_text="test advertisement with lengthy review action text.",
            source_type="text",
            content_hash=f"hash-test-len-{uid}",
            is_demo=False,
            data_source="TEST",
            created_at=now
        )
        db.add(ad)
        db.flush()

        long_action = (
            "Ambiguous or moderate risk indicators detected. "
            "Secondary analyst inspection advised; cross-reference with known threat networks. "
            "Additional forensic investigation steps are strongly advised."
        )
        assert len(long_action) > 128, "Test precondition: string must exceed 128 chars"

        analysis = AnalysisResult(
            advertisement_id=ad.id,
            risk_score=52.5,
            risk_level="MEDIUM",
            model_available=True,
            explanation="Test explanation for lengthy action verification.",
            recommended_review_action=long_action,
            created_at=now
        )
        db.add(analysis)
        db.commit()

        # Re-query and verify length preserved verbatim
        saved = db.query(AnalysisResult).filter(AnalysisResult.advertisement_id == ad.id).first()
        assert saved is not None
        assert saved.recommended_review_action == long_action
        assert len(saved.recommended_review_action) > 128
    finally:
        db.close()


def test_scan_suspicious_ad_persistence():
    """Verify that scanning a suspicious ad triggers rules and persists analysis, evidence, and alerts."""
    payload = {
        "content": "Bank accounts for sale no KYC required. Contact telegram @TestMuleBank now.",
        "source_type": "text",
        "platform": "Telegram"
    }
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert "id" in data
    assert data["custom_id"].startswith("AD-SCAN-")
    assert data["analysis"]["risk_score"] > 35.0
    assert len(data["analysis"]["triggered_rules"]) >= 1
    assert len(data["evidence_items"]) >= 1

    # Verify directly in database
    db = SessionLocal()
    try:
        ad_record = db.query(Advertisement).filter(Advertisement.id == data["id"]).first()
        assert ad_record is not None
        assert ad_record.is_demo is False
        assert ad_record.data_source == "LIVE_SCAN"
        assert ad_record.analysis is not None
        assert ad_record.analysis.risk_score > 35.0
    finally:
        db.close()


def test_seed_database_if_empty_idempotency():
    """Verify seed_database_if_empty runs cleanly and idempotently."""
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        demo_count = db.query(Advertisement).filter(Advertisement.is_demo == True).count()
        assert demo_count >= 15, "Expected at least 15 synthetic demonstration ads to be seeded."

        case_1 = db.query(Case).filter(Case.case_ref == "CASE-2026-001").first()
        assert case_1 is not None

        # Run a second time to ensure idempotency without unique constraint violation
        seed_database_if_empty(db)
        demo_count_2 = db.query(Advertisement).filter(Advertisement.is_demo == True).count()
        assert demo_count_2 == demo_count
    finally:
        db.close()


def test_dashboard_stats_with_data():
    """Verify that dashboard stats endpoint calculates non-zero figures from persisted records."""
    res = client.get("/api/dashboard/stats?include_demo=true")
    assert res.status_code == 200
    stats = res.json()

    assert stats["total_analyzed"] > 0
    assert stats["demo_records_count"] > 0
    assert stats["open_cases_count"] >= 1
    assert "high_risk_count" in stats
    assert "medium_risk_count" in stats
    assert "low_risk_count" in stats

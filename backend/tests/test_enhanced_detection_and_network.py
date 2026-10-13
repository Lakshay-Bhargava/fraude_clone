import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.model_service import load_model, predict_risk
from app.services.rule_engine import evaluate_rules, check_financial_relevance
from app.services.risk_scoring import calculate_composite_risk
from app.services.text_preprocessing import normalize_text
from app.services.entity_extraction import extract_entities, sanitize_phone_number
from app.services.network_service import normalize_graph_identifier, evaluate_cluster_detection

client = TestClient(app)
DATASET_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploaded_dataset.csv"))


# ==============================================================================
# 1. SAFE BANKING & HARD NEGATIVE TESTS
# ==============================================================================

def test_hard_negative_atm_lost_card():
    """Ensure lost ATM card inquiries in Hindi/Hinglish are classified as SAFE with LOW risk."""
    texts = [
        "ATM card kho gaya.",
        "ATM card kho gaya. Kripya card block karwaye.",
        "Mera bank account freeze ho gaya hai, unblock kaise kare?",
        "Looking for bank branch timings to open a new savings account.",
        "Earn daily rewards with our official banking app."
    ]
    for text in texts:
        norm = normalize_text(text)
        rules = evaluate_rules(norm)
        avail, prob, pred_class, version, tokens = predict_risk(norm)
        risk = calculate_composite_risk(
            rules,
            model_available=avail,
            model_signal=prob,
            model_class=pred_class,
            model_version=version,
            model_tokens=tokens
        )
        assert risk["risk_level"] == "LOW", f"Failed on: {text} (score={risk['risk_score']}, level={risk['risk_level']})"
        assert risk["risk_score"] < 35.0
        assert risk["classification"] == "SAFE"


def test_generic_words_without_fraud_context():
    """Ensure generic words like sale, available, daily, earn, selling do NOT trigger fraud alarms."""
    generic_posts = [
        "Selling my old laptop on sale. Daily use laptop available.",
        "Selling my old bicycle. Daily commuter bike available at discount.",
        "Fresh grocery delivery daily available in your locality."
    ]
    for post in generic_posts:
        is_rel, markers = check_financial_relevance(post)
        assert is_rel is False, f"Non-financial post incorrectly marked as financially relevant: {post}"
        rules = evaluate_rules(normalize_text(post))
        avail, prob, pred_class, version, tokens = predict_risk(normalize_text(post))
        risk = calculate_composite_risk(
            rules,
            model_available=avail,
            model_signal=prob,
            model_class=pred_class,
            model_version=version,
            model_tokens=tokens
        )
        assert risk["risk_score"] == 0.0
        assert risk["risk_level"] == "LOW"
        assert risk["classification"] == "SAFE"


def test_protective_awareness_messages():
    """Ensure educational and scam warning posts in Hinglish/English receive benign mitigation discount."""
    protective_posts = [
        "Fraud se bachein: agar koi account kiraye pe lene ko kahe to mana karein",
        "Beware of ads offering money for your bank account. It is illegal. Report such posts.",
        "Scam alert: Legitimate banks will never ask you to forward wire transfers or buy crypto."
    ]
    for post in protective_posts:
        rules = evaluate_rules(normalize_text(post))
        assert rules["is_benign_context"] is True, f"Benign context missed for: {post}"
        avail, prob, pred_class, version, tokens = predict_risk(normalize_text(post))
        risk = calculate_composite_risk(
            rules,
            model_available=avail,
            model_signal=prob,
            model_class=pred_class,
            model_version=version,
            model_tokens=tokens
        )
        assert risk["risk_level"] == "LOW"
        assert risk["risk_score"] <= 15.0
        assert risk["classification"] == "SAFE"


# ==============================================================================
# 2. SUSPICIOUS FINANCIAL FRAUD DETECTION
# ==============================================================================

def test_suspicious_account_and_card_offers():
    """Ensure unauthorized account rentals, pre-loaded cards, and mule offers are flagged."""
    fraud_cases = [
        "Fresh current account available for rent with ATM card and linked SIM",
        "Bank account bikau hai pin + sim ke saath",
        "Pre-loaded ATM card with PIN available, cash out anywhere terminal",
        "savings account for sale no KYC required instantly ready"
    ]
    for case in fraud_cases:
        rules = evaluate_rules(normalize_text(case))
        avail, prob, pred_class, version, tokens = predict_risk(normalize_text(case))
        risk = calculate_composite_risk(
            rules,
            model_available=avail,
            model_signal=prob,
            model_class=pred_class,
            model_version=version,
            model_tokens=tokens
        )
        assert risk["risk_level"] in ["HIGH", "MEDIUM"], f"Missed fraud detection on: {case}"
        assert risk["risk_score"] >= 65.0
        assert risk["classification"] in ["SUSPICIOUS", "NEEDS_REVIEW"]


# ==============================================================================
# 3. IDENTIFIER EXTRACTION & NORMALIZATION SAFEGUARDS
# ==============================================================================

def test_phone_sanitization_rejects_placeholders():
    """Verify that masked and invalid phone numbers are rejected from being treated as real entities."""
    # Masked benchmark placeholder
    assert sanitize_phone_number("+91 97XXXX57XX") is None
    # Repetitive fake numbers
    assert sanitize_phone_number("9999999999") is None
    assert sanitize_phone_number("0000000000") is None
    assert sanitize_phone_number("1234567890") is None
    # Too short
    assert sanitize_phone_number("98765") is None

    # Sequential fake numbers
    assert sanitize_phone_number("9876543210") is None

    # Valid Indian mobile number
    valid = sanitize_phone_number("+91 9823456789")
    assert valid == "9823456789"


def test_entity_extraction_excludes_bare_platform_urls():
    """Ensure generic root platform domains (t.me, wa.me) are not stored as shared URL domain entities."""
    text_with_links = "Join telegram https://t.me/scam_mule_gang and whatsapp https://wa.me/9876543210"
    extracted = extract_entities(text_with_links)

    # Must extract telegram handle and whatsapp, but NOT bare 't.me' as URL_DOMAIN
    types = [e["entity_type"] for e in extracted]
    assert "TELEGRAM" in types
    tg_val = [e["normalized_value"] for e in extracted if e["entity_type"] == "TELEGRAM"][0]
    assert tg_val == "scam_mule_gang"

    url_domains = [e["normalized_value"] for e in extracted if e["entity_type"] == "URL_DOMAIN"]
    assert "t.me" not in url_domains
    assert "wa.me" not in url_domains


def test_normalize_graph_identifier():
    """Ensure graph normalization standardizes valid identifiers and drops placeholders."""
    # Valid
    p_res = normalize_graph_identifier("PHONE", "+91 9823456789")
    assert p_res == ("PHONE", "9823456789", "STRONG")

    u_res = normalize_graph_identifier("UPI_ID", "seller343@fakeupi")
    assert u_res == ("UPI_ID", "seller343@fakeupi", "STRONG")

    # Invalid / Dummy
    dummy_upi = normalize_graph_identifier("UPI_ID", "test@upi")
    assert dummy_upi is None

    masked_phone = normalize_graph_identifier("PHONE", "+91 92XXXX75XX")
    assert masked_phone is None


# ==============================================================================
# 4. NETWORK DETECTION & GROUND TRUTH CLUSTER EVALUATION
# ==============================================================================

def test_ground_truth_cluster_evaluation():
    """
    Evaluates cluster detection on the benchmark dataset.
    Must achieve zero false merges between known clusters and high purity.
    """
    assert os.path.exists(DATASET_PATH), "Benchmark dataset missing"
    metrics = evaluate_cluster_detection(DATASET_PATH)

    assert metrics["total_ground_truth_items"] == 75
    assert metrics["total_ground_truth_clusters"] == 14
    # Must have 0 false merges between distinct ground truth clusters!
    assert metrics["false_cluster_merges"] == 0
    # Must achieve 100% average cluster purity!
    assert metrics["cluster_purity_average"] >= 0.99
    # Must achieve reasonable cluster coverage rate
    assert metrics["cluster_coverage_rate"] >= 0.60


def test_network_endpoint_edge_evidence():
    """Verify /api/network endpoint returns structured edges with evidence strength and coordination status."""
    res = client.get("/api/network?limit=25")
    assert res.status_code == 200
    data = res.json()

    assert "nodes" in data
    assert "edges" in data
    assert "stats" in data
    assert len(data["nodes"]) > 0

    if data["edges"]:
        first_edge = data["edges"][0]
        assert "evidence_strength" in first_edge
        assert "coordination_status" in first_edge
        assert "shared_identifiers" in first_edge


def test_network_evaluation_endpoint():
    """Verify /api/network/evaluation returns ground truth cluster metrics."""
    res = client.get("/api/network/evaluation")
    assert res.status_code == 200
    data = res.json()
    assert "total_ground_truth_items" in data
    assert "cluster_purity_average" in data
    assert "false_cluster_merges" in data
    assert data["false_cluster_merges"] == 0


# ==============================================================================
# 5. API SCAN & COMPATIBILITY
# ==============================================================================

def test_analyze_endpoint_returns_classification_and_disclaimer():
    """Verify /api/ads/analyze returns classification (Safe, Needs Review, Suspicious) and legal disclaimer."""
    payload = {
        "content": "Aadhaar card update kaise kare? Kripya bank branch timings btao.",
        "source_type": "text"
    }
    res = client.post("/api/ads/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()

    analysis = data["analysis"]
    assert "classification" in analysis
    assert analysis["classification"] == "SAFE"
    assert analysis["risk_level"] == "LOW"
    assert "triage indicator" in analysis["explanation"].lower() or "not confirmed" in analysis["explanation"].lower()

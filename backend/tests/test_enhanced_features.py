import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.url_analysis import analyze_url, is_private_or_loopback_ip
from app.services.rule_engine import check_financial_relevance, evaluate_rules
from app.services.risk_scoring import calculate_composite_risk

client = TestClient(app)

def test_financial_relevance_gate_clothing_ad():
    """
    Ordinary commercial advertisement (jeans/clothing) with contact details
    must pass through the gate as non-financial and receive 0 risk score (LOW).
    """
    clothing_ad = (
        "Huge End-of-Season Sale! Buy 1 Get 1 Free on all slim-fit denim jeans and cotton shirts! "
        "Visit our retail store downtown or order online at https://mydenimfashion.com. "
        "Call customer support for store hours: +91 9876543210."
    )
    is_fin, reason = check_financial_relevance(clothing_ad)
    assert is_fin is False, f"Clothing ad was wrongly flagged as financially relevant: {reason}"

    rules = evaluate_rules(clothing_ad)
    risk = calculate_composite_risk(
        rule_results=rules,
        model_available=True,
        model_signal=0.05,
        is_duplicate=False
    )
    assert risk["risk_level"] == "LOW"
    assert risk["risk_score"] == 0.0
    assert "Financial Relevance Gate" in risk["explanation"]

def test_financial_relevance_gate_fraudulent_ad():
    """
    Suspicious financial solicitation (selling mule accounts, ATM cards)
    must be recognized as financial and flagged high risk.
    """
    fraud_ad = (
        "Urgent! Available fresh current accounts with active netbanking and ATM cards for rent. "
        "Earn guaranteed returns of 10% daily without investment. "
        "DM on Telegram @fastcashdrop for instant UPI payment gateway access."
    )
    is_fin, reason = check_financial_relevance(fraud_ad)
    assert is_fin is True

    rules = evaluate_rules(fraud_ad)
    risk = calculate_composite_risk(
        rule_results=rules,
        model_available=True,
        model_signal=0.92,
        is_duplicate=False
    )
    assert risk["risk_level"] == "HIGH"
    assert risk["risk_score"] >= 70.0

def test_url_analysis_ssrf_protection():
    """
    Private and loopback IP addresses must be identified to prevent SSRF vulnerabilities.
    """
    assert is_private_or_loopback_ip("127.0.0.1") is True
    assert is_private_or_loopback_ip("192.168.1.1") is True
    assert is_private_or_loopback_ip("10.0.0.5") is True
    assert is_private_or_loopback_ip("169.254.169.254") is True # Cloud metadata
    assert is_private_or_loopback_ip("8.8.8.8") is False

def test_url_analysis_static_heuristics():
    """
    Tests static heuristics for IP-based URLs, shorteners, and clean URLs.
    """
    # IP address URL
    ip_res = analyze_url("http://192.168.1.1/login")
    assert ip_res["is_ssrf_risk"] is True
    assert any("private" in h.lower() or "ssrf" in h.lower() for h in ip_res["heuristics"])

    # URL shortener
    short_res = analyze_url("https://bit.ly/claim-bank-reward")
    assert short_res["is_suspicious"] is True
    assert any("shortener" in h.lower() for h in short_res["heuristics"])

    # Safe legitimate URL without external API keys
    clean_res = analyze_url("https://www.standardbank.com/portal")
    assert clean_res["is_ssrf_risk"] is False
    assert clean_res["reputation_status"] in ["check_unavailable", "no_known_threat_detected"]

def test_dashboard_stats_endpoint():
    """
    GET /api/dashboard/stats must return live aggregated counts.
    """
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_analyzed" in data
    assert "high_risk_count" in data
    assert "medium_risk_count" in data
    assert "low_risk_count" in data
    assert "open_cases_count" in data
    assert "active_clusters_count" in data
    assert data["total_analyzed"] >= 0

def test_dashboard_trends_endpoint():
    """
    GET /api/dashboard/trends must return time-series for requested days.
    """
    response = client.get("/api/dashboard/trends?days=7")
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) == 7
    for item in trends:
        assert "date" in item
        assert "high_risk" in item
        assert "total" in item
        assert item["total"] == item["high_risk"] + item["medium_risk"] + item["low_risk"]

def test_dashboard_platforms_endpoint():
    """
    GET /api/dashboard/platforms must return aggregated platform counts.
    """
    response = client.get("/api/dashboard/platforms")
    assert response.status_code == 200
    platforms = response.json()
    assert isinstance(platforms, list)
    for p in platforms:
        assert "platform" in p
        assert "suspicious" in p
        assert "total" in p
        assert p["suspicious"] <= p["total"]

def test_dashboard_clusters_endpoint():
    """
    GET /api/dashboard/clusters must return real clusters backed by shared entities.
    """
    response = client.get("/api/dashboard/clusters")
    assert response.status_code == 200
    clusters = response.json()
    assert isinstance(clusters, list)
    for c in clusters:
        assert "cluster_id" in c
        assert "cluster_type" in c
        assert "entity_value" in c
        assert "advertisements_count" in c
        assert c["advertisements_count"] >= 2

def test_dashboard_audit_activity_endpoint():
    """
    GET /api/dashboard/audit-activity must return real audit events.
    """
    response = client.get("/api/dashboard/audit-activity?limit=10")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    if events:
        first = events[0]
        assert "actor" in first
        assert "action" in first
        assert "created_at" in first

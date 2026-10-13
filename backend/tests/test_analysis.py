from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_suspicious_ad():
    payload = {
        "content": "Guaranteed unchecked bank accounts for sale. No KYC verification needed. Contact @FastCashDrop on Telegram.",
        "source_type": "text",
        "submitted_url": "https://t.me/FastCashDrop"
    }
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "analysis" in data
    analysis = data["analysis"]
    assert analysis["risk_score"] >= 65.0
    assert analysis["risk_level"] == "HIGH"
    assert len(analysis["triggered_rules"]) >= 1
    assert any("UNCHECKED" in r["rule_id"] for r in analysis["triggered_rules"])
    assert len(data["entities"]) >= 1

def test_empty_input_rejected():
    payload = {"content": "   ", "source_type": "text"}
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code in [400, 422]

def test_benign_warning_not_false_positive():
    """
    CRITICAL REQUIREMENT: A consumer protection warning or educational article
    must not be flagged as fraudulent despite containing keywords like 'pre-loaded cards'.
    """
    payload = {
        "content": "SCAM ALERT from Consumer Protection Bureau: Be alert to online ads offering pre-loaded debit cards. Legitimate financial institutions will never ask for your PIN or CVV.",
        "source_type": "text"
    }
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    analysis = data["analysis"]
    assert analysis["risk_level"] == "LOW"
    assert analysis["risk_score"] < 35.0
    assert "BENIGN CONTEXT MITIGATION" in analysis["explanation"]

def test_risk_score_bounds():
    payload = {
        "content": "Open a standard high-yield savings account at 4.2% APY with FDIC insurance.",
        "source_type": "text"
    }
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code == 200
    score = response.json()["analysis"]["risk_score"]
    assert 0.0 <= score <= 100.0

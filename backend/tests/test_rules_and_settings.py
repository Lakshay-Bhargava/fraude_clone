from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_duplicate_detection():
    # Analyze exact text
    text = "GUARANTEED UNCHECKED BANK ACCOUNTS FOR SALE! Get fully activated business and personal checking accounts with online access and debit cards. No KYC verification needed. Instant delivery. Contact @FastCashDrop on Telegram or dm +1-555-019-8234 now. Limited slots left today!"
    res1 = client.post("/api/ads/analyze", json={"content": text, "source_type": "text"})
    assert res1.status_code == 200
    
    # Resubmit exact same text
    res2 = client.post("/api/ads/analyze", json={"content": text, "source_type": "text"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["analysis"]["is_duplicate"] is True

def test_settings_threshold_validation():
    # Valid update
    valid_res = client.patch("/api/settings", json={
        "risk_threshold_low": 30,
        "risk_threshold_high": 70,
        "similarity_threshold": 0.8,
        "demo_mode": True
    })
    assert valid_res.status_code == 200

    # Invalid update (low >= high)
    invalid_res = client.patch("/api/settings", json={
        "risk_threshold_low": 80,
        "risk_threshold_high": 40,
        "similarity_threshold": 0.8,
        "demo_mode": True
    })
    assert invalid_res.status_code == 400

def test_threat_network_endpoint():
    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

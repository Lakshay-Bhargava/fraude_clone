from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_case_workflow():
    # 1. Create a Case
    create_payload = {
        "title": "Test Syndicate Account Sale Ring",
        "description": "Automated unit test case creation",
        "priority": "HIGH",
        "ad_ids": [1]
    }
    res = client.post("/api/cases", json=create_payload)
    assert res.status_code == 200
    case_data = res.json()
    case_id = case_data["id"]
    assert case_data["title"] == "Test Syndicate Account Sale Ring"
    assert case_data["status"] == "OPEN"

    # 2. Add an investigation note
    note_payload = {
        "note": "Forensic correlation verified against threat network.",
        "actor": "Lead Analyst"
    }
    note_res = client.post(f"/api/cases/{case_id}/notes", json=note_payload)
    assert note_res.status_code == 200
    assert note_res.json()["note"] == note_payload["note"]

    # 3. Update case status
    update_res = client.patch(f"/api/cases/{case_id}", json={"status": "IN_PROGRESS"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"

def test_alerts_review():
    res = client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    if len(alerts) > 0:
        alert_id = alerts[0]["id"]
        patch_res = client.patch(f"/api/alerts/{alert_id}", json={"reviewed": True})
        assert patch_res.status_code == 200
        assert patch_res.json()["reviewed"] is True

def test_csv_export():
    res = client.get("/api/reports/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Record ID" in res.text

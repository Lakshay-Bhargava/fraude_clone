from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dashboard_stats_and_clusters_schema():
    # Test /api/dashboard/stats
    res = client.get("/api/dashboard/stats?include_demo=true")
    assert res.status_code == 200
    data = res.json()
    assert "total_analyzed" in data
    assert "high_risk_count" in data
    assert "medium_risk_count" in data
    assert "low_risk_count" in data
    assert "active_clusters_count" in data
    assert "total_entities_tracked" in data
    assert isinstance(data["total_analyzed"], int)
    assert isinstance(data["active_clusters_count"], int)

    # Test /api/dashboard/clusters
    c_res = client.get("/api/dashboard/clusters?limit=5")
    assert c_res.status_code == 200
    clusters = c_res.json()
    assert isinstance(clusters, list)
    if len(clusters) > 0:
        c = clusters[0]
        assert "cluster_id" in c
        assert "cluster_type" in c
        assert "entity_value" in c
        assert "advertisements_count" in c
        assert "highest_risk_level" in c
        assert "last_seen" in c

def test_scan_persistence_and_full_detail():
    # Analyze a live scan with entities and suspicious wording
    text = "Urgent requirement: Active bank accounts and merchant UPI for rent. Fast payouts, contact @ScamBoss on Telegram or +91 99988 77766."
    analyze_res = client.post("/api/ads/analyze", json={
        "content": text,
        "source_type": "text",
        "submitted_url": "https://t.me/ScamBoss"
    })
    assert analyze_res.status_code == 200
    ad_data = analyze_res.json()
    ad_id = ad_data["id"]
    custom_id = ad_data["custom_id"]
    
    assert ad_id > 0
    assert custom_id.startswith("AD-SCAN-")
    assert ad_data["platform"] == "Telegram"
    assert ad_data["platform_detected"] == "Telegram"
    assert ad_data["analysis"]["risk_score"] > 0
    assert len(ad_data["entities"]) > 0

    # Retrieve full scan details by integer ID
    detail_res = client.get(f"/api/ads/{ad_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == ad_id
    assert detail["custom_id"] == custom_id
    assert detail["original_text"] == text
    assert detail["submitted_url"] == "https://t.me/ScamBoss"
    assert "analysis" in detail
    assert detail["analysis"]["risk_level"] in ["HIGH", "MEDIUM", "LOW"]
    assert "explanation" in detail["analysis"]
    assert "recommended_review_action" in detail["analysis"]
    assert len(detail["entities"]) > 0

    # Retrieve full scan details by custom_id
    custom_res = client.get(f"/api/ads/{custom_id}")
    assert custom_res.status_code == 200
    assert custom_res.json()["id"] == ad_id

    # Verify search in list_advertisements by phone entity
    search_res = client.get("/api/ads?search=99988")
    assert search_res.status_code == 200
    search_items = search_res.json()["items"]
    assert any(item["id"] == ad_id for item in search_items)
    
    # Verify indicators and platform fields in summary
    target_summary = next(item for item in search_items if item["id"] == ad_id)
    assert "indicators" in target_summary
    assert "platform" in target_summary
    assert "platform_detected" in target_summary

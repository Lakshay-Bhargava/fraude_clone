import io
import os
import pytest
from unittest.mock import patch
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.main import app
from app.services.ocr_service import extract_text_from_image, configure_tesseract
from app.database.session import SessionLocal
from app.models.models import Advertisement, AnalysisResult, Evidence, ExtractedEntity

client = TestClient(app)


from PIL import Image, ImageDraw, ImageFont

def _create_synthetic_image(text: str, size=(700, 250), bg_color=(255, 255, 255), text_color=(0, 0, 0), format="PNG") -> bytes:
    """Helper to generate synthetic test images with clear, legible text."""
    img = Image.new("RGB", size, color=bg_color)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    if text:
        d.multiline_text((25, 30), text, fill=text_color, font=font, spacing=10)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_1_clear_english_text_image():
    """1. A clear image containing readable English text."""
    img_bytes = _create_synthetic_image("URGENT PAYMENT NOTICE - INVOICE DUE")
    
    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("invoice_notice.png", io.BytesIO(img_bytes), "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "URGENT" in data["extracted_text"].upper()
    assert data["filename"] == "invoice_notice.png"


def test_2_synthetic_scam_message_image():
    """2. An image containing a synthetic scam message."""
    scam_text = "Bank account for rent WhatsApp +91 9876543210 @CashDropDeal"
    img_bytes = _create_synthetic_image(scam_text, size=(700, 200), format="JPEG")

    # Step A: OCR Upload
    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("scam_banner.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["extracted_text"]) > 15
    extracted = data["extracted_text"]

    # Step B: Pass into fraud analysis pipeline
    analysis_res = client.post(
        "/api/ads/analyze",
        json={"content": extracted, "source_type": "screenshot"}
    )
    assert analysis_res.status_code == 200
    ad_data = analysis_res.json()
    
    # Must flag as suspicious / needs review / high risk
    assert ad_data["analysis"]["risk_score"] > 35
    assert ad_data["analysis"]["risk_level"] in ["HIGH", "MEDIUM"]
    assert len(ad_data["evidence_items"]) > 0


def test_3_legitimate_sample_message_image():
    """3. A legitimate sample advisory message (never labeled fraud by default)."""
    legit_text = "FRAUD ADVISORY from RBI:\nBeware of fake offers. Never share OTP or bank password.\nLegitimate customer safety notice."
    img_bytes = _create_synthetic_image(legit_text, size=(800, 250))

    # OCR extraction
    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("rbi_advisory.png", io.BytesIO(img_bytes), "image/png")}
    )
    assert res.status_code == 200
    extracted = res.json()["extracted_text"]
    assert len(extracted) > 20

    # Fraud analysis
    analysis_res = client.post(
        "/api/ads/analyze",
        json={"content": extracted, "source_type": "screenshot"}
    )
    assert analysis_res.status_code == 200
    ad_data = analysis_res.json()
    # Legitimate advisory should evaluate to LOW / SAFE
    assert ad_data["analysis"]["risk_level"] in ["LOW", "SAFE"]
    assert ad_data["analysis"]["risk_score"] < 40


def test_4_empty_or_blank_image():
    """4. An empty or blank image returns honest no-text message."""
    blank_bytes = _create_synthetic_image("", size=(300, 300))
    
    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("blank_test.png", io.BytesIO(blank_bytes), "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["extracted_text"] == ""
    assert "no legible text was recognized" in data["message"].lower()


def test_5_corrupt_or_unsupported_image():
    """5. A corrupt or unsupported image is handled gracefully with 400 Bad Request."""
    corrupt_bytes = b"CORRUPT_NOT_A_VALID_IMAGE_HEADER_1234567890"

    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("corrupt.png", io.BytesIO(corrupt_bytes), "image/png")}
    )
    assert res.status_code == 400
    assert "corrupt or not a recognized image format" in res.json()["detail"].lower()


def test_6_missing_tesseract_executable_handling():
    """6. Simulates missing Tesseract executable and verifies graceful diagnostic error."""
    with patch("app.services.ocr_service.configure_tesseract", return_value=(False, None, "Tesseract binary missing")):
        img_bytes = _create_synthetic_image("Testing fallback")
        success, text, msg = extract_text_from_image(img_bytes)
        assert success is False
        assert text == ""
        assert "tesseract" in msg.lower()


def test_7_complete_upload_ocr_analysis_db_workflow():
    """7. The complete upload -> OCR -> fraud analysis -> database persistence workflow."""
    scam_text = "Urgent: Preloaded ATM cards\nverified current accounts for rent\nContact fast @CardDealer on Telegram"
    img_bytes = _create_synthetic_image(scam_text, size=(750, 250), format="JPEG")

    # Step 1: Upload image to OCR endpoint
    ocr_res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("telegram_deal.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    )
    assert ocr_res.status_code == 200
    ocr_data = ocr_res.json()
    assert ocr_data["success"] is True
    extracted_text = ocr_data["extracted_text"]
    assert len(extracted_text) > 20

    # Step 2: Submit extracted OCR text for full fraud analysis with screenshot source
    analyze_res = client.post(
        "/api/ads/analyze",
        json={
            "content": extracted_text,
            "source_type": "screenshot",
            "submitted_url": "https://t.me/CardDealer"
        }
    )
    assert analyze_res.status_code == 200
    ad = analyze_res.json()
    ad_id = ad["id"]
    custom_id = ad["custom_id"]

    assert ad["source_type"] == "screenshot"
    assert ad["analysis"]["risk_score"] > 35
    assert len(ad["evidence_items"]) > 0

    # Step 3: Verify persistence in database
    db = SessionLocal()
    try:
        db_ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        assert db_ad is not None
        assert db_ad.custom_id == custom_id
        assert db_ad.source_type == "screenshot"
        assert db_ad.analysis is not None
        assert db_ad.analysis.risk_score == ad["analysis"]["risk_score"]
        assert len(db_ad.evidence_items) > 0
    finally:
        db.close()

    # Step 4: Verify it appears in GET /api/ads search and history
    history_res = client.get(f"/api/ads?search={custom_id}")
    assert history_res.status_code == 200
    items = history_res.json()["items"]
    assert any(item["id"] == ad_id for item in items)

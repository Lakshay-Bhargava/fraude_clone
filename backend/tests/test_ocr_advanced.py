import os
import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.ocr_service import (
    find_tesseract_binary,
    configure_tesseract,
    extract_text_from_image,
    clean_and_deduplicate_ocr_lines
)
from app.services.entity_extraction import extract_entities
from app.services.rule_engine import evaluate_rules
from app.services.model_service import predict_risk
from app.services.risk_scoring import calculate_composite_risk
from app.services.text_preprocessing import normalize_text

client = TestClient(app)

FIXTURE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tests", "test_fixtures", "shot4.png"))


def test_tesseract_binary_auto_discovery():
    """Verify that Tesseract executable is discovered in bundled repo or host environment."""
    is_avail, bin_path, err_msg = configure_tesseract()
    assert is_avail is True, f"Tesseract engine not discovered: {err_msg}"
    assert bin_path is not None
    assert os.path.isfile(bin_path)


def test_ocr_extraction_on_real_advertisement_screenshot():
    """
    Regression test on actual user advertisement screenshot (shot4.png).
    Verifies that multi-strategy OCR recovers headings, income promises,
    Telegram handles, and phone contact vectors.
    """
    assert os.path.isfile(FIXTURE_PATH), f"Fixture not found at {FIXTURE_PATH}"

    with open(FIXTURE_PATH, "rb") as f:
        image_bytes = f.read()

    success, extracted_text, message = extract_text_from_image(image_bytes)

    assert success is True
    assert len(extracted_text) > 50, "Extracted text is unexpectedly short or empty"
    assert "OCR completed successfully" in message

    text_lower = extracted_text.lower()

    # Verify critical text elements recovered
    assert "work from home" in text_lower, "Missed 'WORK FROM HOME' headline"
    assert "earn daily" in text_lower, "Missed 'EARN DAILY' income claim"
    assert "telegram" in text_lower, "Missed 'Telegram' contact channel"
    assert "@workfromhome_24x7" in text_lower, "Missed Telegram handle '@workfromhome_24x7'"
    assert "98765" in text_lower, "Missed phone number digits"

    # Verify extracted text flows seamlessly into the fraud detection engine
    entities = extract_entities(extracted_text)
    entity_types = {e["entity_type"] for e in entities}
    assert "TELEGRAM" in entity_types, "Failed to extract Telegram entity from OCR text"
    assert any("workfromhome_24x7" in e["normalized_value"] for e in entities if e["entity_type"] == "TELEGRAM")

    # Verify phone extraction
    assert "PHONE" in entity_types, "Failed to extract Phone entity from OCR text"
    assert any("9876543210" in e["normalized_value"] for e in entities if e["entity_type"] == "PHONE")

    # Verify rule engine and composite risk
    norm = normalize_text(extracted_text)
    rules = evaluate_rules(norm)
    avail, prob, p_class, version, tokens = predict_risk(norm)
    risk = calculate_composite_risk(rules, avail, prob, p_class, version, tokens)

    assert risk["risk_score"] > 0, "Risk score must be non-zero for fraudulent advertisement"
    assert risk["classification"] in ["NEEDS_REVIEW", "SUSPICIOUS"]


def test_ocr_api_endpoint_with_real_image():
    """Verify POST /api/ads/ocr-upload endpoint returns expected JSON payload."""
    with open(FIXTURE_PATH, "rb") as f:
        image_bytes = f.read()

    res = client.post(
        "/api/ads/ocr-upload",
        files={"file": ("fraud_ad.png", io.BytesIO(image_bytes), "image/png")}
    )
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert len(data["extracted_text"]) > 0
    assert "workfromhome_24x7" in data["extracted_text"].lower()
    assert "98765" in data["extracted_text"]


def test_ocr_blank_synthetic_image():
    """Verify that pure white image returns success=True with honest 'no legible text' message."""
    img = Image.new("RGB", (400, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    success, text, msg = extract_text_from_image(buf.getvalue())
    assert success is True
    assert text == ""
    assert "no legible text was recognized" in msg


def test_ocr_corrupted_image_handling():
    """Verify that corrupted image bytes return success=False with diagnostic error."""
    corrupted_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"random_corrupt_data" * 20
    success, text, msg = extract_text_from_image(corrupted_bytes)
    assert success is False
    assert text == ""
    assert "failed to open" in msg.lower()


def test_ocr_empty_bytes_handling():
    """Verify empty image payload returns error."""
    success, text, msg = extract_text_from_image(b"")
    assert success is False
    assert "empty" in msg.lower()


def test_clean_and_deduplicate_ocr_lines():
    """Verify line cleaning and symbol deduplication logic."""
    raw = [
        "WORK FROM HOME",
        "  WORK FROM HOME  ",  # Duplicate
        "%%^&*()",             # Junk symbol line
        "Contact: +91 9876543210",
        "Join @channel on Telegram"
    ]
    cleaned = clean_and_deduplicate_ocr_lines(raw)
    assert "WORK FROM HOME" in cleaned
    assert cleaned.count("WORK FROM HOME") == 1
    assert "+91 9876543210" in cleaned
    assert "@channel" in cleaned
    assert "%%^&*()" not in cleaned

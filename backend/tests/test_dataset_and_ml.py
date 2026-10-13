import os
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import Advertisement, AnalysisResult
from app.database.session import SessionLocal
from app.services.model_service import load_model, get_model_metadata, predict_risk
from app.services.risk_scoring import calculate_composite_risk
from app.services.rule_engine import evaluate_rules
from app.services.text_preprocessing import normalize_text

client = TestClient(app)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
TRAIN_CSV = os.path.join(DATA_DIR, "train.csv")
VAL_CSV = os.path.join(DATA_DIR, "val.csv")
TEST_CSV = os.path.join(DATA_DIR, "test.csv")
CLEANING_REPORT_JSON = os.path.join(DATA_DIR, "cleaning_report.json")
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models_cache"))
MODEL_PATH = os.path.join(MODELS_DIR, "baseline_model.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")


def test_clean_splits_exist_and_not_empty():
    """Verify that train, validation, and test split CSVs exist and contain valid records."""
    assert os.path.exists(TRAIN_CSV), "data/train.csv missing"
    assert os.path.exists(VAL_CSV), "data/val.csv missing"
    assert os.path.exists(TEST_CSV), "data/test.csv missing"
    assert os.path.exists(CLEANING_REPORT_JSON), "data/cleaning_report.json missing"

    train_df = pd.read_csv(TRAIN_CSV)
    val_df = pd.read_csv(VAL_CSV)
    test_df = pd.read_csv(TEST_CSV)

    assert len(train_df) > 0, "Train split is empty"
    assert len(val_df) > 0, "Validation split is empty"
    assert len(test_df) > 0, "Test split is empty"
    assert len(train_df) + len(val_df) + len(test_df) == 745, "Total split rows must equal 745"


def test_zero_data_leakage_across_splits():
    """
    CRITICAL TEST: Ensure zero cross-split text group leakage.
    Normalized advertisement texts in Train, Validation, and Test must be strictly disjoint sets!
    """
    train_df = pd.read_csv(TRAIN_CSV)
    val_df = pd.read_csv(VAL_CSV)
    test_df = pd.read_csv(TEST_CSV)

    train_texts = set(train_df["normalized_text"].str.strip().str.lower())
    val_texts = set(val_df["normalized_text"].str.strip().str.lower())
    test_texts = set(test_df["normalized_text"].str.strip().str.lower())

    train_val_overlap = train_texts & val_texts
    train_test_overlap = train_texts & test_texts
    val_test_overlap = val_texts & test_texts

    assert len(train_val_overlap) == 0, f"Leakage detected between Train and Val: {train_val_overlap}"
    assert len(train_test_overlap) == 0, f"Leakage detected between Train and Test: {train_test_overlap}"
    assert len(val_test_overlap) == 0, f"Leakage detected between Val and Test: {val_test_overlap}"


def test_cleaning_report_integrity():
    """Ensure cleaning report contains accurate statistics and documented decisions."""
    with open(CLEANING_REPORT_JSON, "r", encoding="utf-8") as f:
        report = json.load(f)

    assert report["summary"]["original_rows"] == 745
    assert report["summary"]["retained_rows"] == 745
    assert report["summary"]["unique_normalized_text_groups"] == 209
    assert report["leakage_audit_original_csv"]["leaking_text_groups_count"] == 59
    assert report["leakage_safe_splits"]["leakage_verification"]["leakage_free"] is True
    assert len(report["cleaning_decisions"]) > 0


def test_model_loading_and_metadata():
    """Ensure trained model artifact loads properly and metadata includes real metrics."""
    assert os.path.exists(MODEL_PATH), "baseline_model.joblib missing"
    assert os.path.exists(METADATA_PATH), "model_metadata.json missing"

    model = load_model()
    assert model is not None, "Failed to load model pipeline"

    metadata = get_model_metadata()
    assert metadata["model_version"].startswith("fraudscope-")
    assert metadata["dataset_rows"]["total"] == 745
    assert "validation_metrics" in metadata
    assert "test_metrics" in metadata
    assert metadata["validation_metrics"]["roc_auc"] > 0.80
    assert metadata["test_metrics"]["roc_auc"] > 0.80
    assert "evaluation_disclosure" in metadata


def test_model_inference_and_tokens():
    """Test model inference output schema and explainable token contributions."""
    suspicious_text = "Fresh savings a/c bikau hai, urgent, DM karo 💳"
    norm_text = normalize_text(suspicious_text)

    avail, prob, pred_class, version, tokens = predict_risk(norm_text)
    assert avail is True
    assert prob is not None
    assert 0.0 <= prob <= 1.0
    assert pred_class in ["safe", "suspicious"]
    assert isinstance(tokens, list)
    assert len(tokens) > 0
    assert "token" in tokens[0]
    assert "contribution" in tokens[0]


def test_safe_vs_suspicious_predictions():
    """
    Ensure clear differentiation:
    - Suspicious account sale/rental ads are detected with high risk.
    - Harmless consumer questions and educational advisories are low risk.
    """
    # 1. Obvious mule ad
    mule_text = "current account with PIN + SIM + cheque book ready. Serious buyers only DM fast."
    rule_res = evaluate_rules(normalize_text(mule_text))
    avail, prob, p_class, version, tokens = predict_risk(normalize_text(mule_text))
    risk = calculate_composite_risk(
        rule_results=rule_res,
        model_available=avail,
        model_signal=prob,
        model_class=p_class,
        model_version=version,
        model_tokens=tokens
    )
    assert risk["risk_level"] in ["HIGH", "MEDIUM"]
    assert risk["risk_score"] >= 60.0
    assert 0.0 <= risk["risk_score"] <= 100.0

    # 2. Benign informational query (must NOT false-positive)
    benign_text = "Aadhaar card update karne ka process kya hai? nearest center list chahiye."
    b_rule = evaluate_rules(normalize_text(benign_text))
    b_avail, b_prob, b_class, b_version, b_tokens = predict_risk(normalize_text(benign_text))
    b_risk = calculate_composite_risk(
        rule_results=b_rule,
        model_available=b_avail,
        model_signal=b_prob,
        model_class=b_class,
        model_version=b_version,
        model_tokens=b_tokens
    )
    assert b_risk["risk_level"] == "LOW"
    assert b_risk["risk_score"] < 35.0
    assert 0.0 <= b_risk["risk_score"] <= 100.0


def test_api_scan_analysis_and_provenance():
    """Test live scan endpoint /api/ads/analyze marks scans as LIVE_SCAN (is_demo=False)."""
    payload = {
        "content": "Test advertisement for checking live scan endpoint and model scoring.",
        "source_type": "text",
        "platform": "Telegram"
    }
    response = client.post("/api/ads/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert data["is_demo"] is False
    assert data["data_source"] == "LIVE_SCAN"
    assert "analysis" in data
    assert data["analysis"]["model_available"] is True
    assert 0.0 <= data["analysis"]["risk_score"] <= 100.0
    assert "model_version" in data["analysis"]
    assert "model_class" in data["analysis"]


def test_dashboard_stats_and_demo_filtering():
    """Test dashboard stats endpoint returns model metadata and separates demo vs live counts."""
    # With all records (include_demo=True)
    res_all = client.get("/api/dashboard/stats?include_demo=true")
    assert res_all.status_code == 200
    data_all = res_all.json()

    assert data_all["total_analyzed"] >= 745
    assert data_all["demo_records_count"] >= 745
    assert "live_scans_count" in data_all
    assert data_all["model_status"] == "online"
    assert data_all["model_version"] is not None
    assert data_all["vocabulary_size"] is not None

    # Filtered to live only (include_demo=false)
    res_live = client.get("/api/dashboard/stats?include_demo=false")
    assert res_live.status_code == 200
    data_live = res_live.json()
    assert data_live["total_analyzed"] == data_all["live_scans_count"]


def test_empty_and_excessive_input_validation():
    """Ensure empty or blank inputs return a 400 Bad Request."""
    empty_res = client.post("/api/ads/analyze", json={"content": "   "})
    assert empty_res.status_code == 400
    assert "empty" in empty_res.json()["detail"].lower()

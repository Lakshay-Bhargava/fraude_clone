"""
FRAUDSCOPE AI — Safe Model Inference & Explainability Service
=============================================================
Safely loads the trained TF-IDF + Logistic Regression pipeline from disk,
reads training and evaluation metadata, and generates calibrated risk probabilities
along with token-level explainability for investigator dossiers.
Thresholds are dynamically read from validation-calibrated model metadata.
"""

import os
import re
import json
import joblib
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models_cache"))
MODEL_PATH = os.path.join(MODEL_DIR, "baseline_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# Purely generic transactional words filtered from unigrams to prevent false positives
GENERIC_UNIGRAMS = {
    "sale", "available", "daily", "earn", "selling", "buy",
    "order", "deal", "use", "offering", "accepted", "transfer"
}

def tokenize_with_context(text: str) -> List[str]:
    """
    Context-aware n-gram tokenizer for financial fraud detection.
    Suppresses isolated generic unigrams (like 'sale', 'available', 'earn') from being
    standalone positive fraud predictors, while preserving them in bigrams and trigrams
    (e.g., 'account for sale', 'bank account available', 'daily limit').
    """
    tokens = re.findall(r"(?u)\b[a-zA-Z0-9_]{2,}\b", text.lower())
    unigrams = [t for t in tokens if t not in GENERIC_UNIGRAMS]
    bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]
    trigrams = [f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}" for i in range(len(tokens) - 2)]
    return unigrams + bigrams + trigrams

_pipeline: Optional[Pipeline] = None
_metadata: Optional[Dict[str, Any]] = None

DEFAULT_SUSPICIOUS_THRESHOLD = 0.65  # Calibrated on validation split
DEFAULT_NEEDS_REVIEW_THRESHOLD = 0.45


def load_model() -> Optional[Pipeline]:
    """
    Safely loads the serialized scikit-learn pipeline from models_cache.
    Caches the loaded pipeline in memory. Never retrains on request.
    """
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    try:
        if os.path.exists(MODEL_PATH):
            _pipeline = joblib.load(MODEL_PATH)
            return _pipeline
        else:
            print(f"[ModelService] Notice: Model artifact not found at {MODEL_PATH}. Rule engine will act as fallback.")
            return None
    except Exception as e:
        print(f"[ModelService] Warning: Failed to load model pipeline ({e}). Rule fallback active.")
        return None


def get_or_train_model() -> Optional[Pipeline]:
    """Startup hook to safely load or initialize the pipeline into cache."""
    return load_model()


def reload_model_cache():
    """Forces cache refresh if model artifact is updated on disk."""
    global _pipeline, _metadata
    _pipeline = None
    _metadata = None


def get_model_metadata() -> Dict[str, Any]:
    """
    Returns the training timestamp, dataset version, and evaluation metrics.
    """
    global _metadata
    if _metadata is not None:
        return _metadata

    try:
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                _metadata = json.load(f)
                return _metadata
    except Exception as e:
        print(f"[ModelService] Notice: Could not read metadata file ({e}).")

    return {
        "model_version": "fraudscope-baseline-fallback",
        "algorithm": "Heuristic Rule Fallback",
        "trained_at_utc": None,
        "thresholds": {
            "suspicious": DEFAULT_SUSPICIOUS_THRESHOLD,
            "needs_review": DEFAULT_NEEDS_REVIEW_THRESHOLD
        },
        "evaluation_metrics": None
    }


def predict_risk(
    text: str,
    custom_threshold: Optional[float] = None
) -> Tuple[bool, Optional[float], Optional[str], Optional[str], List[Dict[str, Any]]]:
    """
    Performs inference on advertisement text.
    Uses validation-calibrated thresholds to distinguish Safe, Needs Review, and Suspicious.
    Returns:
        (model_available, probability_score_0_to_1, predicted_class, model_version, contributing_tokens)
    """
    if not text or not text.strip():
        return False, None, None, None, []

    model = load_model()
    metadata = get_model_metadata()
    model_version = metadata.get("model_version", "fraudscope-v1.0")

    if model is None:
        return False, None, None, None, []

    try:
        vectorizer: TfidfVectorizer = model.named_steps["tfidf"]
        clf: LogisticRegression = model.named_steps["clf"]

        # Calculate probability: [P(safe), P(suspicious)]
        proba_array = model.predict_proba([text])[0]
        prob_suspicious = float(proba_array[1])

        # Retrieve validation-calibrated thresholds
        thresh_cfg = metadata.get("thresholds", {})
        susp_th = custom_threshold if custom_threshold is not None else float(thresh_cfg.get("suspicious", DEFAULT_SUSPICIOUS_THRESHOLD))
        rev_th = float(thresh_cfg.get("needs_review", DEFAULT_NEEDS_REVIEW_THRESHOLD))

        if prob_suspicious >= susp_th:
            predicted_class = "suspicious"
        elif prob_suspicious >= rev_th:
            predicted_class = "needs_review"
        else:
            predicted_class = "safe"

        # Calculate token-level feature contributions for explainability
        feature_names = np.array(vectorizer.get_feature_names_out())
        coefs = clf.coef_[0]
        transformed = vectorizer.transform([text])

        contributing_tokens: List[Dict[str, Any]] = []
        nonzero_indices = transformed.nonzero()[1]

        for idx in nonzero_indices:
            tfidf_val = float(transformed[0, idx])
            coef_val = float(coefs[idx])
            contribution = tfidf_val * coef_val
            token_str = str(feature_names[idx])
            contributing_tokens.append({
                "token": token_str,
                "contribution": round(contribution, 4),
                "type": "suspicious_indicator" if contribution > 0 else "benign_indicator"
            })

        # Sort by absolute impact
        contributing_tokens.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        top_tokens = contributing_tokens[:6]

        return True, round(prob_suspicious, 4), predicted_class, model_version, top_tokens

    except Exception as e:
        print(f"[ModelService] Inference warning ({e}). Graceful rule fallback active.")
        return False, None, None, None, []

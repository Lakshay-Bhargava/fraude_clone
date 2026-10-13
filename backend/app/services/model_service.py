"""
FRAUDSCOPE AI — Safe Model Inference & Explainability Service
=============================================================
Safely loads the trained TF-IDF + Logistic Regression pipeline from disk,
reads training and evaluation metadata, and generates calibrated risk probabilities
along with token-level explainability for investigator dossiers.
"""

import os
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

_pipeline: Optional[Pipeline] = None
_metadata: Optional[Dict[str, Any]] = None


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
        "evaluation_metrics": None
    }


def predict_risk(text: str) -> Tuple[bool, Optional[float], Optional[str], Optional[str], List[Dict[str, Any]]]:
    """
    Performs inference on advertisement text.
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
        # Extract individual steps from the pipeline
        vectorizer: TfidfVectorizer = model.named_steps["tfidf"]
        clf: LogisticRegression = model.named_steps["clf"]

        # Calculate probability: [P(safe), P(suspicious)]
        proba_array = model.predict_proba([text])[0]
        prob_suspicious = float(proba_array[1])
        predicted_class = "suspicious" if prob_suspicious >= 0.50 else "safe"

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


# Backward compatibility aliases
def get_or_train_model():
    return load_model()

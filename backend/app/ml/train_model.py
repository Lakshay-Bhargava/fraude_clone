"""
FRAUDSCOPE AI — Real ML Model Training, Evaluation & Persistence
================================================================
Trains a reproducible TF-IDF + Logistic Regression baseline model
on the leakage-safe training split, evaluates separately on validation
and test splits, and persists the pipeline and metadata.
"""

import os
import sys
import json
import joblib
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    classification_report
)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
TRAIN_PATH = os.path.join(DATA_DIR, "train.csv")
VAL_PATH = os.path.join(DATA_DIR, "val.csv")
TEST_PATH = os.path.join(DATA_DIR, "test.csv")

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models_cache"))
MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "baseline_model.joblib")
METADATA_SAVE_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
EVAL_REPORT_MD_PATH = os.path.join(MODELS_DIR, "evaluation_report.md")


def train_and_evaluate(
    random_state: int = 42,
    c_param: float = 1.0,
    max_features: int = 3000
) -> Dict[str, Any]:
    print("=" * 70)
    print("FRAUDSCOPE AI — MODEL TRAINING & RIGOROUS EVALUATION")
    print("=" * 70)

    os.makedirs(MODELS_DIR, exist_ok=True)

    if not os.path.exists(TRAIN_PATH):
        raise FileNotFoundError(f"Training split missing at: {TRAIN_PATH}. Run dataset_pipeline first.")

    train_df = pd.read_csv(TRAIN_PATH)
    val_df = pd.read_csv(VAL_PATH)
    test_df = pd.read_csv(TEST_PATH)

    print(f"Loaded splits: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    # Target variable: 1 for suspicious, 0 for safe
    y_train = (train_df["label"] == "suspicious").astype(int).values
    y_val = (val_df["label"] == "suspicious").astype(int).values
    y_test = (test_df["label"] == "suspicious").astype(int).values

    X_train = train_df["text"].values
    X_val = val_df["text"].values
    X_test = test_df["text"].values

    # Pipeline definition
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=2,
            max_features=max_features,
            sublinear_tf=True
        )),
        ("clf", LogisticRegression(
            class_weight="balanced",
            C=c_param,
            random_state=random_state,
            max_iter=1000
        ))
    ])

    print("[1] Fitting TF-IDF + Logistic Regression pipeline strictly on training data...")
    pipeline.fit(X_train, y_train)

    # Feature inspection
    vectorizer: TfidfVectorizer = pipeline.named_steps["tfidf"]
    clf: LogisticRegression = pipeline.named_steps["clf"]
    feature_names = np.array(vectorizer.get_feature_names_out())
    coefs = clf.coef_[0]

    top_suspicious_idx = np.argsort(coefs)[-15:][::-1]
    top_safe_idx = np.argsort(coefs)[:15]

    top_suspicious_features = [(feature_names[i], round(float(coefs[i]), 4)) for i in top_suspicious_idx]
    top_safe_features = [(feature_names[i], round(float(coefs[i]), 4)) for i in top_safe_idx]

    # Evaluation on Validation Split
    print("[2] Evaluating on Validation split...")
    val_preds = pipeline.predict(X_val)
    val_probs = pipeline.predict_proba(X_val)[:, 1]
    val_cm = confusion_matrix(y_val, val_preds).tolist()
    val_metrics = {
        "accuracy": round(float(accuracy_score(y_val, val_preds)), 4),
        "precision": round(float(precision_score(y_val, val_preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_val, val_preds, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_val, val_preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_val, val_probs)), 4),
        "pr_auc": round(float(average_precision_score(y_val, val_probs)), 4),
        "confusion_matrix": {
            "true_negatives": int(val_cm[0][0]),
            "false_positives": int(val_cm[0][1]),
            "false_negatives": int(val_cm[1][0]),
            "true_positives": int(val_cm[1][1])
        },
        "classification_report": classification_report(y_val, val_preds, target_names=["safe", "suspicious"], output_dict=True)
    }

    # Evaluation on Final Test Split
    print("[3] Evaluating on Test split (unseen held-out evaluation)...")
    test_preds = pipeline.predict(X_test)
    test_probs = pipeline.predict_proba(X_test)[:, 1]
    test_cm = confusion_matrix(y_test, test_preds).tolist()
    test_metrics = {
        "accuracy": round(float(accuracy_score(y_test, test_preds)), 4),
        "precision": round(float(precision_score(y_test, test_preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, test_preds, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, test_preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, test_probs)), 4),
        "pr_auc": round(float(average_precision_score(y_test, test_probs)), 4),
        "confusion_matrix": {
            "true_negatives": int(test_cm[0][0]),
            "false_positives": int(test_cm[0][1]),
            "false_negatives": int(test_cm[1][0]),
            "true_positives": int(test_cm[1][1])
        },
        "classification_report": classification_report(y_test, test_preds, target_names=["safe", "suspicious"], output_dict=True)
    }

    # Save Pipeline to disk
    joblib.dump(pipeline, MODEL_SAVE_PATH)
    print(f"[4] Model pipeline persisted to: {MODEL_SAVE_PATH}")

    # Build Metadata object
    model_version = "fraudscope-tfidf-lr-v1.0"
    train_timestamp = datetime.now(timezone.utc).isoformat()
    metadata = {
        "model_version": model_version,
        "algorithm": "TF-IDF Vectorizer + Logistic Regression (class_weight='balanced')",
        "trained_at_utc": train_timestamp,
        "dataset_version": "fraudscope-benchmark-v1-cleaned",
        "dataset_rows": {
            "total": len(train_df) + len(val_df) + len(test_df),
            "train": len(train_df),
            "val": len(val_df),
            "test": len(test_df)
        },
        "feature_configuration": {
            "ngram_range": [1, 2],
            "min_df": 2,
            "max_features": max_features,
            "vocabulary_size": int(len(feature_names)),
            "regularization_C": c_param,
            "class_weight": "balanced"
        },
        "top_features": {
            "suspicious": [{"token": tok, "weight": wt} for tok, wt in top_suspicious_features],
            "safe": [{"token": tok, "weight": wt} for tok, wt in top_safe_features]
        },
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
        "evaluation_disclosure": (
            "NOTICE: Evaluation was performed on a held-out, leakage-safe test split with ZERO text-group overlap. "
            "Performance on synthetic benchmark advertisements does not establish identical real-world operational fraud detection accuracy. "
            "In production, ML probability must always be combined with the deterministic heuristic rule engine and human analyst review."
        )
    }

    with open(METADATA_SAVE_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[5] Model metadata saved to: {METADATA_SAVE_PATH}")

    # Build Markdown evaluation report
    md_content = f"""# FraudScope AI — Model Training & Evaluation Report

**Model Version:** `{model_version}`  
**Trained Timestamp:** `{train_timestamp}`  
**Algorithm:** Logistic Regression with Sublinear TF-IDF (1-2 ngrams) & Balanced Class Weights  
**Vocabulary Size:** {len(feature_names)} features  

---

## 1. Validation Split Metrics (n = {len(val_df)})
- **Accuracy:** {val_metrics['accuracy'] * 100:.2f}%
- **Precision:** {val_metrics['precision'] * 100:.2f}%
- **Recall:** {val_metrics['recall'] * 100:.2f}%
- **F1-Score:** {val_metrics['f1_score'] * 100:.2f}%
- **ROC-AUC:** {val_metrics['roc_auc']:.4f}
- **PR-AUC:** {val_metrics['pr_auc']:.4f}

### Validation Confusion Matrix
| Actual \\ Predicted | Predicted Safe | Predicted Suspicious |
| :--- | :---: | :---: |
| **Actual Safe** | {val_metrics['confusion_matrix']['true_negatives']} (TN) | {val_metrics['confusion_matrix']['false_positives']} (FP) |
| **Actual Suspicious** | {val_metrics['confusion_matrix']['false_negatives']} (FN) | {val_metrics['confusion_matrix']['true_positives']} (TP) |

---

## 2. Held-Out Test Split Metrics (n = {len(test_df)})
- **Accuracy:** {test_metrics['accuracy'] * 100:.2f}%
- **Precision:** {test_metrics['precision'] * 100:.2f}%
- **Recall:** {test_metrics['recall'] * 100:.2f}%
- **F1-Score:** {test_metrics['f1_score'] * 100:.2f}%
- **ROC-AUC:** {test_metrics['roc_auc']:.4f}
- **PR-AUC:** {test_metrics['pr_auc']:.4f}

### Test Confusion Matrix
| Actual \\ Predicted | Predicted Safe | Predicted Suspicious |
| :--- | :---: | :---: |
| **Actual Safe** | {test_metrics['confusion_matrix']['true_negatives']} (TN) | {test_metrics['confusion_matrix']['false_positives']} (FP) |
| **Actual Suspicious** | {test_metrics['confusion_matrix']['false_negatives']} (FN) | {test_metrics['confusion_matrix']['true_positives']} (TP) |

---

## 3. Top Predictive Linguistic Indicators

### Suspicious Signals (Positive Weights)
{chr(10).join([f"- **`{tok}`**: +{wt}" for tok, wt in top_suspicious_features[:10]])}

### Safe & Protective Signals (Negative Weights)
{chr(10).join([f"- **`{tok}`**: {wt}" for tok, wt in top_safe_features[:10]])}

---

## 4. Methodological Disclosures
> [!IMPORTANT]
> 1. **Zero Text Leakage**: Evaluated on completely disjoint text groups. No text in the test set was present during training.
> 2. **Synthetic Corpus Disclaimer**: High ranking power (ROC-AUC {test_metrics['roc_auc']:.4f}) reflects benchmark domain discrimination. Synthetic dataset metrics do not guarantee identical real-world operational accuracy.
> 3. **Hybrid Defense Architecture**: FraudScope AI pairs this statistical model with a rule-based heuristic engine and contextual entity extraction to prevent single-point-of-failure errors.
"""

    with open(EVAL_REPORT_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[6] Evaluation report written to: {EVAL_REPORT_MD_PATH}")
    print("=" * 70)
    return metadata


if __name__ == "__main__":
    train_and_evaluate()

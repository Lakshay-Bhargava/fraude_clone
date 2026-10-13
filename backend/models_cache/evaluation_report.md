# FraudScope AI — Model Training & Evaluation Report

**Model Version:** `fraudscope-tfidf-lr-v1.0`  
**Trained Timestamp:** `2026-10-13T15:54:04.940198+00:00`  
**Algorithm:** Logistic Regression with Sublinear TF-IDF (1-2 ngrams) & Balanced Class Weights  
**Vocabulary Size:** 572 features  

---

## 1. Validation Split Metrics (n = 98)
- **Accuracy:** 69.39%
- **Precision:** 56.52%
- **Recall:** 100.00%
- **F1-Score:** 72.22%
- **ROC-AUC:** 1.0000
- **PR-AUC:** 1.0000

### Validation Confusion Matrix
| Actual \ Predicted | Predicted Safe | Predicted Suspicious |
| :--- | :---: | :---: |
| **Actual Safe** | 29 (TN) | 30 (FP) |
| **Actual Suspicious** | 0 (FN) | 39 (TP) |

---

## 2. Held-Out Test Split Metrics (n = 103)
- **Accuracy:** 63.11%
- **Precision:** 44.93%
- **Recall:** 100.00%
- **F1-Score:** 62.00%
- **ROC-AUC:** 0.9713
- **PR-AUC:** 0.9420

### Test Confusion Matrix
| Actual \ Predicted | Predicted Safe | Predicted Suspicious |
| :--- | :---: | :---: |
| **Actual Safe** | 34 (TN) | 38 (FP) |
| **Actual Suspicious** | 0 (FN) | 31 (TP) |

---

## 3. Top Predictive Linguistic Indicators

### Suspicious Signals (Positive Weights)
- **`karo`**: +1.2953
- **`dm`**: +1.1913
- **`पर`**: +1.0907
- **`कर`**: +1.0907
- **`account`**: +1.0905
- **`available`**: +0.9973
- **`paisa`**: +0.9889
- **`paisa milega`**: +0.9476
- **`kiraye pe`**: +0.9464
- **`kiraye`**: +0.9464

### Safe & Protective Signals (Negative Weights)
- **`kya`**: -1.4673
- **`ka`**: -1.3399
- **`gaya`**: -1.2447
- **`kaise`**: -1.1367
- **`ke`**: -1.0163
- **`ke liye`**: -1.0163
- **`liye`**: -1.0163
- **`update`**: -0.9765
- **`kaunsa`**: -0.8421
- **`mein`**: -0.8061

---

## 4. Methodological Disclosures
> [!IMPORTANT]
> 1. **Zero Text Leakage**: Evaluated on completely disjoint text groups. No text in the test set was present during training.
> 2. **Synthetic Corpus Disclaimer**: High ranking power (ROC-AUC 0.9713) reflects benchmark domain discrimination. Synthetic dataset metrics do not guarantee identical real-world operational accuracy.
> 3. **Hybrid Defense Architecture**: FraudScope AI pairs this statistical model with a rule-based heuristic engine and contextual entity extraction to prevent single-point-of-failure errors.

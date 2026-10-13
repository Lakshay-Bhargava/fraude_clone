import os
import joblib
from typing import Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models_cache")
MODEL_PATH = os.path.join(MODEL_DIR, "baseline_model.joblib")

# Synthetic bootstrap training dataset (fictional demonstration corpus)
BOOTSTRAP_DATA = [
    # Suspicious / High-risk patterns (Label: 1)
    ("Guaranteed unchecked bank accounts for sale. No KYC verification needed. Instant delivery.", 1),
    ("Pre-loaded ATM debit cards with PIN included. Cash out balance $10,000 at any ATM terminal.", 1),
    ("Urgent: Bank security certificate expired. Enter your online banking PIN and full card CVV now.", 1),
    ("Rent your checking account to receive wire transfers. Make $1,500 daily passive income.", 1),
    ("Need cash today? Advance fee of $200 required to unlock $25,000 loan line. Act before midnight.", 1),
    ("Cloned cards ready to ship worldwide discreetly. Contact Telegram handle @CashVaultDrop.", 1),
    ("High yield private investment: 40% weekly returns completely risk-free using automated bot.", 1),
    ("Buy aged verified business accounts. Zero ID needed, clean history, full online access.", 1),
    ("Cash out methods and preloaded card dumps with fresh PINs. Ping on WhatsApp now.", 1),
    ("Your account is locked. Provide your one-time passcode OTP immediately to prevent closure.", 1),
    
    # Benign / Educational / Legitimate patterns (Label: 0)
    ("SCAM ALERT from Consumer Protection: Beware of ads offering pre-loaded cards or selling accounts.", 0),
    ("Legitimate financial institutions will never ask for your PIN, CVV, or one-time passcode.", 0),
    ("How to protect your small business from money mule schemes and illegal account renting.", 0),
    ("Community Credit Union: Open a high-yield savings account today with 4.5% APY. FDIC-insured.", 0),
    ("Special promotional credit card: 0% introductory APR for 15 months on balance transfers.", 0),
    ("Cybersecurity tip: Never share your banking login credentials or passwords over SMS.", 0),
    ("Personal financial literacy guide: Understanding credit scores, interest rates, and loan terms.", 0),
    ("National Bank official portal: Schedule an appointment with a verified loan advisor.", 0),
    ("Federal Trade Commission warning: Report fake prize notifications and advance fee schemes.", 0),
    ("Commercial banking services: Certificate of deposit accounts with guaranteed fixed rates.", 0),
]

_pipeline: Optional[Pipeline] = None

def get_or_train_model() -> Optional[Pipeline]:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    try:
        os.makedirs(MODEL_DIR, exist_ok=True)
        if os.path.exists(MODEL_PATH):
            _pipeline = joblib.load(MODEL_PATH)
            return _pipeline
        
        # Train baseline TF-IDF + Logistic Regression
        texts = [item[0] for item in BOOTSTRAP_DATA]
        labels = [item[1] for item in BOOTSTRAP_DATA]

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english", max_features=1000)),
            ("clf", LogisticRegression(random_state=42, C=1.0))
        ])
        pipeline.fit(texts, labels)
        joblib.dump(pipeline, MODEL_PATH)
        _pipeline = pipeline
        return _pipeline
    except Exception as e:
        print(f"[ModelService] Notice: ML baseline could not be initialized ({e}). Graceful rule fallback active.")
        return None

def predict_risk(text: str) -> Tuple[bool, Optional[float]]:
    """
    Returns (model_available, probability_score_0_to_1).
    Probability is the predicted likelihood of suspicious financial ad patterns.
    """
    model = get_or_train_model()
    if model is None:
        return False, None
    
    try:
        # Logistic regression returns [P(legit), P(suspicious)]
        proba = model.predict_proba([text])[0][1]
        return True, float(proba)
    except Exception:
        return False, None

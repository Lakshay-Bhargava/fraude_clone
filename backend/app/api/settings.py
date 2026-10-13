from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import SystemSetting
from app.services.rule_engine import SUSPICIOUS_RULES
from app.services.model_service import get_or_train_model

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdatePayload(BaseModel):
    risk_threshold_low: int = 35
    risk_threshold_high: int = 65
    similarity_threshold: float = 0.78
    demo_mode: bool = True

@router.get("")
def get_system_settings(db: Session = Depends(get_db)):
    """
    Returns platform settings, active detection rules, and ML model status.
    """
    settings_records = db.query(SystemSetting).all()
    settings_dict = {s.key: s.value for s in settings_records}

    # Inspect ML model status
    model = get_or_train_model()
    model_online = model is not None

    rules_meta = []
    for r in SUSPICIOUS_RULES:
        rules_meta.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "weight": r["weight"],
            "description": r["explanation"]
        })

    return {
        "risk_threshold_low": int(settings_dict.get("risk_threshold_low", 35)),
        "risk_threshold_high": int(settings_dict.get("risk_threshold_high", 65)),
        "similarity_threshold": float(settings_dict.get("similarity_threshold", 0.78)),
        "demo_mode": settings_dict.get("demo_mode", "true").lower() == "true",
        "ml_model": {
            "status": "ONLINE" if model_online else "OFFLINE_FALLBACK",
            "type": "TF-IDF + LogisticRegression",
            "version": "1.0-bootstrap"
        },
        "active_rules": rules_meta,
        "platform": {
            "name": "FraudScope AI",
            "version": "1.0.0",
            "environment": "Local Hackathon Instance"
        }
    }

@router.patch("")
def update_system_settings(payload: SettingsUpdatePayload, db: Session = Depends(get_db)):
    """
    Updates platform thresholds and persists changes into SQLite.
    Validates threshold ranges (0 <= low < high <= 100).
    """
    if not (0 <= payload.risk_threshold_low < payload.risk_threshold_high <= 100):
        raise HTTPException(status_code=400, detail="Invalid thresholds: Must satisfy 0 <= low < high <= 100.")
    if not (0.1 <= payload.similarity_threshold <= 1.0):
        raise HTTPException(status_code=400, detail="Similarity threshold must be between 0.1 and 1.0.")

    def set_val(k: str, v: str):
        rec = db.query(SystemSetting).filter_by(key=k).first()
        if rec:
            rec.value = v
        else:
            db.add(SystemSetting(key=k, value=v))

    set_val("risk_threshold_low", str(payload.risk_threshold_low))
    set_val("risk_threshold_high", str(payload.risk_threshold_high))
    set_val("similarity_threshold", str(payload.similarity_threshold))
    set_val("demo_mode", "true" if payload.demo_mode else "false")

    db.commit()
    return {"message": "Settings updated successfully."}

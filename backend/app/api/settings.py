from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import SystemSetting, User
from app.core.security import get_current_user
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
def update_system_settings(
    payload: SettingsUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    Updates platform thresholds and persists changes into database.
    Requires authenticated user session.
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

@router.post("/seed-demo")
def trigger_seed_demo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually triggers idempotent seeding of demonstration advertisements, cases, and alerts.
    Requires authenticated investigator or administrator credentials.
    """
    from app.services.seed_data import seed_database_if_empty
    seed_database_if_empty(db)
    return {"status": "success", "message": "Demonstration records seeded successfully."}

@router.post("/import-dataset")
def trigger_import_dataset(
    max_records: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Imports up to max_records from the benchmark Indian financial scam dataset into the database.
    Requires authenticated investigator or administrator credentials.
    """
    from app.ml.import_dataset_to_db import import_dataset
    try:
        res = import_dataset(db, max_records=max_records)
        return {"status": "success", "imported": res.get("imported", 0), "skipped": res.get("skipped", 0)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset import failed: {str(e)}")

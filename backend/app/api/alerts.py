from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Alert, Advertisement
from app.schemas.schemas import AlertSchema, AlertUpdateSchema

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertSchema])
def list_alerts(
    db: Session = Depends(get_db),
    reviewed: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None)
):
    """
    Retrieves system security and triage alerts.
    """
    query = db.query(Alert)
    if reviewed is not None:
        query = query.filter(Alert.reviewed == reviewed)
    if severity:
        query = query.filter(Alert.severity == severity.upper())

    alerts = query.order_by(desc(Alert.created_at)).all()
    results = []
    for a in alerts:
        results.append(AlertSchema(
            id=a.id,
            advertisement_id=a.advertisement_id,
            custom_id=a.advertisement.custom_id if a.advertisement else None,
            alert_type=a.alert_type,
            title=a.alert_type.replace('_', ' ').title(),
            severity=a.severity,
            message=a.message,
            reviewed=a.reviewed,
            created_at=a.created_at
        ))
    return results

@router.patch("/{id}", response_model=AlertSchema)
def update_alert(id: int, payload: AlertUpdateSchema, db: Session = Depends(get_db)):
    """
    Marks an alert as reviewed or pending.
    """
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.reviewed = payload.reviewed
    db.commit()
    db.refresh(alert)

    return AlertSchema(
        id=alert.id,
        advertisement_id=alert.advertisement_id,
        custom_id=alert.advertisement.custom_id if alert.advertisement else None,
        alert_type=alert.alert_type,
        title=alert.alert_type.replace('_', ' ').title(),
        severity=alert.severity,
        message=alert.message,
        reviewed=alert.reviewed,
        created_at=alert.created_at
    )

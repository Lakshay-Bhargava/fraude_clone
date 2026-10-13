from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Advertisement, AnalysisResult, Case, Alert, ExtractedEntity
from app.schemas.schemas import DashboardStatsResponse, DashboardActivityItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns live aggregated database metrics for the intelligence console.
    All figures are calculated directly from SQLite tables.
    """
    total_analyzed = db.query(Advertisement).count()
    
    high_risk_count = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "HIGH").count()
    medium_risk_count = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "MEDIUM").count()
    low_risk_count = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "LOW").count()

    open_cases_count = db.query(Case).filter(Case.status.in_(["OPEN", "IN_PROGRESS", "ESCALATED"])).count()
    awaiting_review_count = db.query(Advertisement).filter(Advertisement.review_status.in_(["NEW", "NEEDS_REVIEW"])).count()
    total_entities_tracked = db.query(ExtractedEntity).count()

    return DashboardStatsResponse(
        total_analyzed=total_analyzed,
        high_risk_count=high_risk_count,
        medium_risk_count=medium_risk_count,
        low_risk_count=low_risk_count,
        open_cases_count=open_cases_count,
        awaiting_review_count=awaiting_review_count,
        total_entities_tracked=total_entities_tracked,
        demo_mode=True
    )

@router.get("/activity", response_model=List[DashboardActivityItem])
def get_dashboard_activity(db: Session = Depends(get_db)):
    """
    Returns time-series volume of advertisement scans grouped across the past 7 days.
    """
    now = datetime.now(timezone.utc)
    activity_map = {}

    # Initialize last 7 days with zero counts
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        activity_map[day_date] = {"high": 0, "medium": 0, "low": 0}

    # Query advertisements joined with analysis results
    records = db.query(Advertisement.created_at, AnalysisResult.risk_level)\
        .join(AnalysisResult, isouter=True)\
        .all()

    for created_at, risk_level in records:
        if created_at:
            day_str = created_at.strftime("%Y-%m-%d")
            if day_str in activity_map:
                r_key = (risk_level or "LOW").lower()
                if r_key in activity_map[day_str]:
                    activity_map[day_str][r_key] += 1

    result = []
    for day_str, counts in sorted(activity_map.items()):
        total = counts["high"] + counts["medium"] + counts["low"]
        result.append(DashboardActivityItem(
            date=day_str,
            high_risk=counts["high"],
            medium_risk=counts["medium"],
            low_risk=counts["low"],
            total=total
        ))

    return result

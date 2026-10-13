from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.session import get_db
from app.models.models import (
    Advertisement, AnalysisResult, Case, Alert, ExtractedEntity,
    AuditEvent, SystemSetting
)
from app.schemas.schemas import (
    DashboardStatsResponse, DashboardActivityItem,
    DashboardPlatformItem, DashboardActivityLogItem, DashboardClusterItem
)

from app.services.model_service import load_model, get_model_metadata

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
@router.get("/summary", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    include_demo: bool = Query(default=True, description="Whether to include imported demo/synthetic dataset in metrics"),
    db: Session = Depends(get_db)
):
    """
    Returns live aggregated database metrics for the intelligence console.
    All figures are calculated directly from SQLite tables.
    Provides clear segmentation between demo records and real user scans.
    """
    # Calculate live vs demo breakdown
    demo_records_count = db.query(Advertisement).filter(Advertisement.is_demo == True).count()
    live_scans_count = db.query(Advertisement).filter(Advertisement.is_demo == False).count()

    ad_query = db.query(Advertisement)
    analysis_query = db.query(AnalysisResult).join(Advertisement, Advertisement.id == AnalysisResult.advertisement_id)

    if not include_demo:
        ad_query = ad_query.filter(Advertisement.is_demo == False)
        analysis_query = analysis_query.filter(Advertisement.is_demo == False)

    total_analyzed = ad_query.count()

    high_risk_count = analysis_query.filter(AnalysisResult.risk_level == "HIGH").count()
    medium_risk_count = analysis_query.filter(AnalysisResult.risk_level == "MEDIUM").count()
    low_risk_count = analysis_query.filter(AnalysisResult.risk_level == "LOW").count()

    open_cases_count = db.query(Case).filter(Case.status.in_(["OPEN", "IN_PROGRESS", "ESCALATED"])).count()
    awaiting_review_count = ad_query.filter(
        Advertisement.review_status.in_(["NEW", "NEEDS_REVIEW"])
    ).count()
    
    if not include_demo:
        total_entities_tracked = db.query(ExtractedEntity).join(Advertisement).filter(Advertisement.is_demo == False).count()
    else:
        total_entities_tracked = db.query(ExtractedEntity).count()

    # Calculate active clusters (entities shared across >= 2 distinct advertisements)
    cluster_subq = db.query(ExtractedEntity.normalized_value)\
        .join(Advertisement)\
        .filter(Advertisement.is_demo == False if not include_demo else True)\
        .group_by(ExtractedEntity.entity_type, ExtractedEntity.normalized_value)\
        .having(func.count(ExtractedEntity.advertisement_id.distinct()) > 1)\
        .subquery()
    active_clusters_count = db.query(cluster_subq).count()

    # Read demo mode setting
    demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_mode").first()
    is_demo_mode = demo_setting.value.lower() == "true" if demo_setting else False

    # Retrieve real ML model training metadata
    model_obj = load_model()
    model_meta = get_model_metadata()
    model_status = "online" if model_obj is not None else "offline"
    model_version = model_meta.get("model_version", "fraudscope-v1.0")
    last_trained = model_meta.get("trained_at_utc")
    vocab_size = model_meta.get("feature_configuration", {}).get("vocabulary_size")

    return DashboardStatsResponse(
        total_analyzed=total_analyzed,
        high_risk_count=high_risk_count,
        medium_risk_count=medium_risk_count,
        low_risk_count=low_risk_count,
        open_cases_count=open_cases_count,
        awaiting_review_count=awaiting_review_count,
        total_entities_tracked=total_entities_tracked,
        active_clusters_count=active_clusters_count,
        demo_mode=is_demo_mode,
        demo_records_count=demo_records_count,
        live_scans_count=live_scans_count,
        model_status=model_status,
        model_version=model_version,
        last_trained_at=last_trained,
        vocabulary_size=vocab_size
    )

@router.get("/trends", response_model=List[DashboardActivityItem])
@router.get("/activity", response_model=List[DashboardActivityItem])
def get_dashboard_trends(
    days: int = Query(default=7, ge=1, le=90),
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db)
):
    """
    Returns time-series volume of advertisement scans grouped across the past N days.
    """
    now = datetime.now(timezone.utc)
    activity_map = {}

    # Initialize requested date range with zero counts
    for i in range(days - 1, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        activity_map[day_date] = {"high": 0, "medium": 0, "low": 0}

    # Query advertisements joined with analysis results
    cutoff = now - timedelta(days=days)
    query = db.query(Advertisement.created_at, AnalysisResult.risk_level)\
        .join(AnalysisResult, isouter=True)\
        .filter(Advertisement.created_at >= cutoff)
    
    if not include_demo:
        query = query.filter(Advertisement.is_demo == False)

    records = query.all()

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

@router.get("/platforms", response_model=List[DashboardPlatformItem])
def get_dashboard_platforms(
    include_demo: bool = Query(default=True),
    db: Session = Depends(get_db)
):
    """
    Returns distribution of analyzed advertisements grouped by platform.
    Counts total ads and suspicious (HIGH + MEDIUM risk) ads per platform.
    """
    query = db.query(Advertisement.platform, AnalysisResult.risk_level)\
        .join(AnalysisResult, isouter=True)

    if not include_demo:
        query = query.filter(Advertisement.is_demo == False)

    records = query.all()

    platform_map = {}
    for platform, risk_level in records:
        p_name = platform if platform and platform.strip() else "Unknown"
        if p_name not in platform_map:
            platform_map[p_name] = {"total": 0, "suspicious": 0}
        platform_map[p_name]["total"] += 1
        if (risk_level or "").upper() in ["HIGH", "MEDIUM"]:
            platform_map[p_name]["suspicious"] += 1

    result = []
    # Sort by suspicious descending
    for p_name, data in sorted(platform_map.items(), key=lambda x: x[1]["suspicious"], reverse=True):
        result.append(DashboardPlatformItem(
            platform=p_name,
            suspicious=data["suspicious"],
            total=data["total"]
        ))
    return result

@router.get("/audit-activity", response_model=List[DashboardActivityLogItem])
def get_dashboard_audit_activity(limit: int = Query(default=12, ge=1, le=50), db: Session = Depends(get_db)):
    """
    Returns actual recorded investigation and scan events from AuditEvent table.
    """
    events = db.query(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(limit).all()
    results = []
    for ev in events:
        # Determine severity badge
        details_lower = (ev.details or "").lower()
        severity = "INFO"
        if "high" in details_lower or "escalated" in details_lower:
            severity = "HIGH"
        elif "medium" in details_lower or "warning" in details_lower:
            severity = "MEDIUM"
        elif "low" in details_lower:
            severity = "LOW"

        results.append(DashboardActivityLogItem(
            id=ev.id,
            actor=ev.actor or "System",
            action=ev.action,
            entity_type=ev.entity_type,
            entity_id=ev.entity_id,
            details=ev.details,
            created_at=ev.created_at,
            severity=severity
        ))
    return results

@router.get("/clusters", response_model=List[DashboardClusterItem])
def get_dashboard_clusters(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """
    Returns active syndicates/clusters formed by shared normalized entities across advertisements.
    """
    # Find shared entities
    shared = db.query(
        ExtractedEntity.entity_type,
        ExtractedEntity.normalized_value,
        func.count(ExtractedEntity.advertisement_id.distinct()).label("ad_count"),
        func.max(ExtractedEntity.id).label("max_id")
    )\
    .group_by(ExtractedEntity.entity_type, ExtractedEntity.normalized_value)\
    .having(func.count(ExtractedEntity.advertisement_id.distinct()) > 1)\
    .order_by(desc("ad_count"))\
    .limit(limit)\
    .all()

    clusters = []
    for idx, (etype, norm_val, ad_count, max_id) in enumerate(shared, start=1):
        # Fetch associated advertisement IDs and their max risk
        ad_entities = db.query(ExtractedEntity.advertisement_id)\
            .filter(ExtractedEntity.entity_type == etype, ExtractedEntity.normalized_value == norm_val)\
            .all()
        ad_ids = [ae[0] for ae in ad_entities]

        # Get highest risk level among these ads
        risks = db.query(AnalysisResult.risk_level)\
            .filter(AnalysisResult.advertisement_id.in_(ad_ids))\
            .all()
        risk_levels = [r[0] for r in risks if r[0]]
        highest_risk = "HIGH" if "HIGH" in risk_levels else ("MEDIUM" if "MEDIUM" in risk_levels else "LOW")

        # Get latest advertisement creation timestamp
        latest_ad = db.query(Advertisement.created_at)\
            .filter(Advertisement.id.in_(ad_ids))\
            .order_by(desc(Advertisement.created_at))\
            .first()
        last_seen = latest_ad[0] if latest_ad else datetime.now(timezone.utc)

        cluster_id = f"CL-{etype[:3].upper()}-{idx:03d}"
        clusters.append(DashboardClusterItem(
            cluster_id=cluster_id,
            cluster_type=etype,
            entity_value=norm_val,
            advertisements_count=ad_count,
            advertisement_ids=ad_ids,
            highest_risk_level=highest_risk,
            last_seen=last_seen
        ))

    return clusters

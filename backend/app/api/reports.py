import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Advertisement, AnalysisResult, Case, Alert, Evidence, ExtractedEntity

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

def sanitize_csv_cell(val: Any) -> str:
    """
    Prevents CSV Formula Injection (CWE-1236) by neutralizing
    leading characters that spreadsheet applications interpret as executable formulas (=, +, -, @, tab, cr).
    """
    if val is None:
        return ""
    text = str(val)
    if text and text[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + text
    return text

@router.get("/summary")
def get_reports_summary(db: Session = Depends(get_db)):
    """
    Generates an executive investigative intelligence summary.
    """
    total_ads = db.query(Advertisement).count()
    high_risk = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "HIGH").count()
    med_risk = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "MEDIUM").count()
    low_risk = db.query(AnalysisResult).filter(AnalysisResult.risk_level == "LOW").count()

    total_cases = db.query(Case).count()
    open_cases = db.query(Case).filter(Case.status.in_(["OPEN", "IN_PROGRESS", "ESCALATED"])).count()
    closed_cases = db.query(Case).filter(Case.status == "CLOSED").count()

    return {
        "report_id": f"REP-{datetime.now().strftime('%Y%m%d')}-001",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "classification": "INTERNAL FORENSIC INVESTIGATION REPORT",
        "metrics": {
            "total_advertisements_evaluated": total_ads,
            "risk_distribution": {
                "high_risk": high_risk,
                "medium_risk": med_risk,
                "low_risk": low_risk
            },
            "cases": {
                "total": total_cases,
                "open": open_cases,
                "closed": closed_cases
            }
        },
        "disclaimer": (
            "NOTICE: FraudScope AI scores and findings are investigative signals designed to aid human analysts. "
            "They do not constitute legal proof of criminal activity, certified fraud findings, or verified probabilities of guilt."
        )
    }

@router.get("/export")
def export_advertisements_csv(db: Session = Depends(get_db)):
    """
    Exports all analyzed advertisement records, risk scores, and disposition status
    as a sanitized, downloadable CSV file.
    """
    ads = db.query(Advertisement).order_by(Advertisement.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    headers = [
        "Record ID",
        "Source Type",
        "Risk Score (0-100)",
        "Risk Level",
        "Review Status",
        "Submitted URL",
        "Extracted Entities Count",
        "Created At (UTC)",
        "Advertisement Text Preview"
    ]
    writer.writerow(headers)

    for ad in ads:
        risk_score = ad.analysis.risk_score if ad.analysis else ""
        risk_level = ad.analysis.risk_level if ad.analysis else ""
        preview = ad.original_text.replace("\n", " ")[:200]

        row = [
            sanitize_csv_cell(ad.custom_id or ad.id),
            sanitize_csv_cell(ad.source_type),
            sanitize_csv_cell(risk_score),
            sanitize_csv_cell(risk_level),
            sanitize_csv_cell(ad.review_status),
            sanitize_csv_cell(ad.submitted_url or ""),
            sanitize_csv_cell(len(ad.entities)),
            sanitize_csv_cell(ad.created_at.isoformat() if ad.created_at else ""),
            sanitize_csv_cell(preview)
        ]
        writer.writerow(row)

    csv_data = output.getvalue()
    filename = f"fraudscope_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

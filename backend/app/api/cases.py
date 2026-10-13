import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import Case, CaseNote, Advertisement, AuditEvent, case_advertisements
from app.schemas.schemas import CaseSchema, CaseCreateSchema, CaseUpdateSchema, CaseNoteCreateSchema, CaseNoteSchema, AdSummarySchema

router = APIRouter(prefix="/cases", tags=["Case Management"])

@router.get("", response_model=List[CaseSchema])
def list_cases(
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None)
):
    """
    Lists investigation cases with associated record counts.
    """
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status.upper())
    if priority:
        query = query.filter(Case.priority == priority.upper())

    cases = query.order_by(desc(Case.updated_at)).all()
    result = []

    for c in cases:
        # Fetch associated ads
        ads = db.query(Advertisement)\
            .join(case_advertisements, case_advertisements.c.advertisement_id == Advertisement.id)\
            .filter(case_advertisements.c.case_id == c.id)\
            .all()

        ad_summaries = []
        for ad in ads:
            ad_summaries.append(AdSummarySchema(
                id=ad.id,
                custom_id=ad.custom_id,
                original_text=ad.original_text,
                source_type=ad.source_type,
                submitted_url=ad.submitted_url,
                risk_score=ad.analysis.risk_score if ad.analysis else None,
                risk_level=ad.analysis.risk_level if ad.analysis else None,
                review_status=ad.review_status,
                created_at=ad.created_at,
                entities_count=len(ad.entities),
                cases_count=len(ad.cases)
            ))

        result.append(CaseSchema(
            id=c.id,
            case_ref=c.case_ref,
            title=c.title,
            description=c.description,
            priority=c.priority,
            status=c.status,
            assigned_to=c.assigned_to,
            created_at=c.created_at,
            updated_at=c.updated_at,
            advertisements_count=len(ads),
            advertisements=ad_summaries,
            notes=c.notes
        ))

    return result

@router.post("", response_model=CaseSchema)
def create_case(payload: CaseCreateSchema, db: Session = Depends(get_db)):
    """
    Opens a new investigation case, associates candidate advertisement records,
    and initializes the investigative audit log.
    """
    case_ref = f"CASE-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
    now = datetime.now(timezone.utc)

    new_case = Case(
        case_ref=case_ref,
        title=payload.title,
        description=payload.description,
        priority=payload.priority.upper(),
        status="OPEN",
        assigned_to=payload.assigned_to or "Analyst Alpha",
        created_at=now,
        updated_at=now
    )
    db.add(new_case)
    db.flush()

    # Link candidate ads
    if payload.ad_ids:
        for aid in payload.ad_ids:
            ad = db.query(Advertisement).filter(Advertisement.id == aid).first()
            if ad:
                db.execute(case_advertisements.insert().values(
                    case_id=new_case.id,
                    advertisement_id=ad.id
                ))
                # Update ad review status to UNDER_INVESTIGATION
                ad.review_status = "UNDER_INVESTIGATION"

    # Add inaugural audit event
    db.add(AuditEvent(
        actor=payload.assigned_to or "Analyst Alpha",
        action="CREATE_CASE",
        entity_type="CASE",
        entity_id=str(new_case.id),
        details=f"Created case {case_ref}: '{payload.title}' with {len(payload.ad_ids)} linked advertisement(s)",
        created_at=now
    ))

    db.commit()
    db.refresh(new_case)
    return get_case_detail(new_case.id, db)

@router.get("/{id}", response_model=CaseSchema)
def get_case_detail(id: int, db: Session = Depends(get_db)):
    """
    Retrieves full details for an investigation case including linked advertisements and notes.
    """
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    ads = db.query(Advertisement)\
        .join(case_advertisements, case_advertisements.c.advertisement_id == Advertisement.id)\
        .filter(case_advertisements.c.case_id == c.id)\
        .all()

    ad_summaries = []
    for ad in ads:
        ad_summaries.append(AdSummarySchema(
            id=ad.id,
            custom_id=ad.custom_id,
            original_text=ad.original_text,
            source_type=ad.source_type,
            submitted_url=ad.submitted_url,
            risk_score=ad.analysis.risk_score if ad.analysis else None,
            risk_level=ad.analysis.risk_level if ad.analysis else None,
            review_status=ad.review_status,
            created_at=ad.created_at,
            entities_count=len(ad.entities),
            cases_count=len(ad.cases)
        ))

    return CaseSchema(
        id=c.id,
        case_ref=c.case_ref,
        title=c.title,
        description=c.description,
        priority=c.priority,
        status=c.status,
        assigned_to=c.assigned_to,
        created_at=c.created_at,
        updated_at=c.updated_at,
        advertisements_count=len(ads),
        advertisements=ad_summaries,
        notes=c.notes
    )

@router.patch("/{id}", response_model=CaseSchema)
def update_case(id: int, payload: CaseUpdateSchema, db: Session = Depends(get_db)):
    """
    Updates case properties (status, priority, assignment, title) and maintains audit logs.
    """
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    changes = []
    if payload.title is not None:
        c.title = payload.title
        changes.append("title")
    if payload.description is not None:
        c.description = payload.description
        changes.append("description")
    if payload.priority is not None:
        c.priority = payload.priority.upper()
        changes.append(f"priority->{c.priority}")
    if payload.status is not None:
        c.status = payload.status.upper()
        changes.append(f"status->{c.status}")
    if payload.assigned_to is not None:
        c.assigned_to = payload.assigned_to
        changes.append(f"assigned_to->{c.assigned_to}")

    # Add ad IDs if requested
    if payload.add_ad_ids:
        for aid in payload.add_ad_ids:
            exists = db.execute(
                case_advertisements.select().where(
                    case_advertisements.c.case_id == c.id,
                    case_advertisements.c.advertisement_id == aid
                )
            ).first()
            if not exists:
                db.execute(case_advertisements.insert().values(case_id=c.id, advertisement_id=aid))
                changes.append(f"linked_ad_{aid}")

    c.updated_at = datetime.now(timezone.utc)

    db.add(AuditEvent(
        actor=c.assigned_to,
        action="UPDATE_CASE",
        entity_type="CASE",
        entity_id=str(c.id),
        details=f"Updated case {c.case_ref}: {', '.join(changes)}",
        created_at=datetime.now(timezone.utc)
    ))

    db.commit()
    db.refresh(c)
    return get_case_detail(c.id, db)

@router.post("/{id}/notes", response_model=CaseNoteSchema)
def add_case_note(id: int, payload: CaseNoteCreateSchema, db: Session = Depends(get_db)):
    """
    Appends an analyst finding or investigative update to a case.
    """
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    now = datetime.now(timezone.utc)
    note = CaseNote(
        case_id=c.id,
        note=payload.note,
        actor=payload.actor or "Analyst Alpha",
        created_at=now
    )
    db.add(note)
    c.updated_at = now

    db.add(AuditEvent(
        actor=payload.actor or "Analyst Alpha",
        action="ADD_NOTE",
        entity_type="CASE",
        entity_id=str(c.id),
        details=f"Added investigation note to {c.case_ref}",
        created_at=now
    ))

    db.commit()
    db.refresh(note)
    return note

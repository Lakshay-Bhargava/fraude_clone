from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.models.models import Advertisement, ExtractedEntity

def check_exact_duplicate(db: Session, content_hash: str, exclude_id: Optional[int] = None) -> Optional[Advertisement]:
    """
    Checks if a record with the exact same normalized content hash already exists.
    """
    query = db.query(Advertisement).filter(Advertisement.content_hash == content_hash)
    if exclude_id:
        query = query.filter(Advertisement.id != exclude_id)
    return query.first()

def find_near_duplicates(db: Session, text: str, threshold: float = 0.78, limit: int = 5, exclude_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Compares submitted text against existing database records using token sort similarity.
    Returns matched records exceeding the similarity threshold.
    """
    query = db.query(Advertisement)
    if exclude_id:
        query = query.filter(Advertisement.id != exclude_id)
    
    # In a hackathon dataset of up to hundreds of ads, this linear scan is fast (<5ms)
    existing_records = query.order_by(Advertisement.id.desc()).limit(150).all()
    matches = []

    for rec in existing_records:
        ratio = fuzz.token_sort_ratio(text, rec.normalized_text) / 100.0
        if ratio >= threshold:
            matches.append({
                "advertisement_id": rec.id,
                "custom_id": rec.custom_id,
                "similarity_score": round(ratio * 100, 1),
                "review_status": rec.review_status,
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
                "preview": rec.original_text[:120] + ("..." if len(rec.original_text) > 120 else "")
            })

    # Sort descending by similarity
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches[:limit]

def find_shared_entity_matches(db: Session, entities: List[Dict[str, str]], exclude_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Identifies existing advertisement records that share any normalized entity values
    (e.g., shared phone number, shared Telegram channel, or shared destination domain).
    """
    if not entities:
        return []

    shared_results = []
    seen_ads = set()

    for ent in entities:
        etype = ent.get("entity_type")
        norm_val = ent.get("normalized_value")
        if not norm_val:
            continue

        query = db.query(ExtractedEntity).filter(
            ExtractedEntity.entity_type == etype,
            ExtractedEntity.normalized_value == norm_val
        )
        if exclude_id:
            query = query.filter(ExtractedEntity.advertisement_id != exclude_id)

        matching_entities = query.all()
        for me in matching_entities:
            ad = me.advertisement
            if ad and ad.id not in seen_ads:
                seen_ads.add(ad.id)
                shared_results.append({
                    "advertisement_id": ad.id,
                    "custom_id": ad.custom_id,
                    "shared_entity_type": etype,
                    "shared_entity_value": ent.get("entity_value"),
                    "review_status": ad.review_status,
                    "created_at": ad.created_at.isoformat() if ad.created_at else None,
                    "preview": ad.original_text[:100] + ("..." if len(ad.original_text) > 100 else "")
                })

    return shared_results

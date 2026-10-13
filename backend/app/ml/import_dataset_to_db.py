"""
FRAUDSCOPE AI — Idempotent Dataset Importer
===========================================
Imports the uploaded Indian financial ad benchmark dataset into the SQLite database.
Mandatory Provenance Rules:
- Every record is explicitly marked with is_demo=True and data_source='SYNTHETIC_DATASET'.
- Idempotent: Can be run multiple times safely without duplicate record creation.
- Preserves distinct timestamps, platforms, phone numbers, UPI IDs, and categories.
- Runs the real trained ML model + heuristic rules to populate forensic dossiers.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, engine, Base
from app.models.models import (
    Advertisement, AnalysisResult, ExtractedEntity, Evidence
)
from app.services.text_preprocessing import normalize_text, calculate_content_hash
from app.services.entity_extraction import extract_entities
from app.services.rule_engine import evaluate_rules
from app.services.model_service import predict_risk
from app.services.risk_scoring import calculate_composite_risk

DATASET_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "uploaded_dataset.csv"))


def import_dataset(db: Session, max_records: int = None) -> dict:
    if not os.path.exists(DATASET_CSV_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_CSV_PATH}")

    df = pd.read_csv(DATASET_CSV_PATH, sep="\t")
    # Drop trailing unnamed columns if any
    df = df[[c for c in df.columns if not c.startswith("Unnamed:")]].copy()
    df.columns = [c.strip() for c in df.columns]

    if max_records:
        df = df.head(max_records)

    total_rows = len(df)
    imported_count = 0
    skipped_count = 0

    print(f"[DatasetImport] Starting idempotent import of {total_rows} benchmark rows...")

    for idx, row in df.iterrows():
        post_id = str(row["post_id"]).strip()
        custom_id = f"DEMO-{post_id}"

        # 1. Idempotency Check: Do not duplicate existing records
        existing_ad = db.query(Advertisement).filter(Advertisement.custom_id == custom_id).first()
        if existing_ad:
            skipped_count += 1
            continue

        raw_text = str(row["text"]).strip()
        norm_text = normalize_text(raw_text)
        content_hash = calculate_content_hash(norm_text)

        platform = str(row.get("platform", "Unknown")).strip()
        submitted_url = str(row.get("url", "")).strip() if pd.notna(row.get("url")) else None
        if submitted_url == "":
            submitted_url = None

        # Parse timestamp safely
        ts_str = str(row.get("timestamp", "")).strip()
        try:
            created_at = datetime.strptime(ts_str, "%Y-%m-%d %H:%M")
        except Exception:
            created_at = datetime.now(timezone.utc)

        # 2. Run real intelligence pipeline: ML + Rules + Entities
        extracted = extract_entities(raw_text, submitted_url)

        # Add explicit CSV-provided metadata entities if available
        if pd.notna(row.get("phone")) and str(row.get("phone")).strip():
            ph_val = str(row["phone"]).strip()
            if not any(e["entity_value"] == ph_val for e in extracted):
                extracted.append({
                    "entity_type": "PHONE",
                    "entity_value": ph_val,
                    "normalized_value": ph_val.replace(" ", "").replace("-", "")
                })

        if pd.notna(row.get("upi_id")) and str(row.get("upi_id")).strip():
            upi_val = str(row["upi_id"]).strip()
            if not any(e["entity_value"] == upi_val for e in extracted):
                extracted.append({
                    "entity_type": "UPI",
                    "entity_value": upi_val,
                    "normalized_value": upi_val.lower()
                })

        rule_res = evaluate_rules(norm_text)
        model_avail, model_prob, model_class, model_version, model_tokens = predict_risk(norm_text)

        risk_info = calculate_composite_risk(
            rule_results=rule_res,
            model_available=model_avail,
            model_signal=model_prob,
            model_class=model_class,
            model_version=model_version,
            model_tokens=model_tokens,
            is_duplicate=False
        )

        # 3. Create Advertisement strictly tagged as DEMO
        ad = Advertisement(
            custom_id=custom_id,
            original_text=raw_text,
            normalized_text=norm_text,
            source_type="csv_batch",
            submitted_url=submitted_url,
            platform=platform,
            is_demo=True,
            data_source="SYNTHETIC_DATASET",
            content_hash=content_hash,
            created_at=created_at,
            review_status="NEEDS_REVIEW" if risk_info["risk_level"] in ["HIGH", "MEDIUM"] else "NEW"
        )
        db.add(ad)
        db.flush()

        # 4. Create Analysis Result
        analysis = AnalysisResult(
            advertisement_id=ad.id,
            risk_score=risk_info["risk_score"],
            risk_level=risk_info["risk_level"],
            model_available=model_avail,
            model_signal=model_prob,
            model_score=risk_info.get("model_score"),
            model_version=risk_info.get("model_version"),
            model_class=risk_info.get("model_class"),
            explanation=risk_info["explanation"],
            recommended_review_action=risk_info["recommended_review_action"],
            created_at=created_at
        )
        db.add(analysis)

        # 5. Create Extracted Entities
        for ed in extracted:
            db.add(ExtractedEntity(
                advertisement_id=ad.id,
                entity_type=ed["entity_type"],
                entity_value=ed["entity_value"],
                normalized_value=ed["normalized_value"]
            ))

        # 6. Create Evidence Items
        for tr in rule_res["triggered_rules"]:
            for phrase in tr["matched_phrases"]:
                db.add(Evidence(
                    advertisement_id=ad.id,
                    evidence_type=tr["category"],
                    matched_text=phrase,
                    description=f"Rule trigger '{tr['rule_name']}': {tr['explanation']}",
                    source_location="Ad text",
                    created_at=created_at
                ))

        imported_count += 1
        if imported_count % 50 == 0:
            db.commit()
            print(f"  Processed {imported_count} / {total_rows} rows...")

    db.commit()
    print(f"[DatasetImport] Complete! Imported: {imported_count}, Skipped (already existed): {skipped_count}")

    return {
        "total_rows": total_rows,
        "imported": imported_count,
        "skipped": skipped_count
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        import_dataset(db)
    finally:
        db.close()

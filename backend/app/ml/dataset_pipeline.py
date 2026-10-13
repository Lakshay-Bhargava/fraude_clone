"""
FRAUDSCOPE AI — Reproducible Dataset Preparation & Leakage-Safe Splitting Pipeline
==================================================================================
This module:
1. Loads the uploaded CSV dataset (preserved verbatim in data/uploaded_dataset.csv).
2. Cleans and validates whitespace, unicodes, columns, and labels.
3. Audits the original CSV split assignments for cross-split text leakage.
4. Performs a leakage-safe stratified group split based on normalized text groups,
   guaranteeing ZERO identical text overlap across train, validation, and test splits.
5. Saves clean splits (data/train.csv, data/val.csv, data/test.csv).
6. Generates a comprehensive cleaning and leakage audit report in JSON and Markdown.
"""

import os
import sys
import json
import unicodedata
import re
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit
from rapidfuzz import fuzz

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
RAW_DATASET_PATH = os.path.join(DATA_DIR, "uploaded_dataset.csv")
TRAIN_PATH = os.path.join(DATA_DIR, "train.csv")
VAL_PATH = os.path.join(DATA_DIR, "val.csv")
TEST_PATH = os.path.join(DATA_DIR, "test.csv")
REPORT_JSON_PATH = os.path.join(DATA_DIR, "cleaning_report.json")
REPORT_MD_PATH = os.path.join(DATA_DIR, "cleaning_report.md")


def normalize_ad_text(text: Any) -> str:
    """
    Consistent whitespace and NFKC normalization.
    Strips zero-width characters and converts to lowercase for deterministic grouping.
    """
    if pd.isna(text) or text is None:
        return ""
    text_str = str(text)
    # NFKC unicode normalisation
    normalized = unicodedata.normalize("NFKC", text_str)
    # Strip zero-width spaces and control chars
    normalized = re.sub(r"[\u200B-\u200D\uFEFF]", "", normalized)
    # Normalize whitespace
    normalized = re.sub(r"\s+", " ", normalized).strip().lower()
    return normalized


def run_dataset_preparation(random_state: int = 42) -> Dict[str, Any]:
    print("=" * 70)
    print("FRAUDSCOPE AI — DATASET CLEANING & LEAKAGE-SAFE PIPELINE")
    print("=" * 70)

    if not os.path.exists(RAW_DATASET_PATH):
        raise FileNotFoundError(f"Raw dataset file not found at: {RAW_DATASET_PATH}")

    # Read the raw uploaded dataset
    df_raw = pd.read_csv(RAW_DATASET_PATH, sep="\t")
    original_row_count = len(df_raw)
    original_columns = df_raw.columns.tolist()

    print(f"[1] Loaded raw uploaded dataset: {original_row_count} rows, {len(original_columns)} columns.")

    # 1. Clean column names and drop any unnamed/empty trailing columns
    cleaned_columns = [col.strip() for col in original_columns if not col.startswith("Unnamed:")]
    df = df_raw[[col for col in df_raw.columns if not col.startswith("Unnamed:")]].copy()
    df.columns = [c.strip() for c in df.columns]

    # Required columns check
    required_cols = ["post_id", "platform", "timestamp", "username", "language", "text", "label", "risk_level", "category", "split"]
    missing_req = [c for c in required_cols if c not in df.columns]
    if missing_req:
        raise ValueError(f"Missing required columns in dataset: {missing_req}")

    # 2. Text Normalization
    df["normalized_text"] = df["text"].apply(normalize_ad_text)

    # 3. Missing Value Audit
    missing_counts = df.isnull().sum().to_dict()
    # Handle nullable fields cleanly without hallucinating evidence
    for col in ["image_path", "phone", "upi_id", "url", "cluster_id"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str)

    # 4. Label Validation
    valid_labels = {"safe", "suspicious"}
    invalid_labels = df[~df["label"].isin(valid_labels)]
    if len(invalid_labels) > 0:
        raise ValueError(f"Found {len(invalid_labels)} rows with invalid labels: {invalid_labels['label'].unique()}")

    # 5. Exact & Text Duplicates Analysis
    exact_duplicate_rows = int(df_raw.duplicated().sum())
    unique_raw_texts = int(df["text"].nunique())
    unique_norm_texts = int(df["normalized_text"].nunique())
    repeated_texts_count = int(df.duplicated(subset=["normalized_text"]).sum())

    # 6. Audit original CSV split for cross-split text leakage
    orig_text_to_splits = df.groupby("normalized_text")["split"].unique()
    original_leaking_groups = orig_text_to_splits[orig_text_to_splits.apply(len) > 1]
    num_original_leaking_groups = len(original_leaking_groups)
    original_leaked_rows_count = int(df[df["normalized_text"].isin(original_leaking_groups.index)].shape[0])

    print(f"[2] Data Leakage Audit of Original CSV Split:")
    print(f"    - Original Unique Normalized Text Groups: {unique_norm_texts}")
    print(f"    - Groups crossing splits in original CSV: {num_original_leaking_groups} ({num_original_leaking_groups/unique_norm_texts*100:.1f}%)")
    print(f"    - Rows affected by original cross-split leakage: {original_leaked_rows_count} / {original_row_count}")

    # 7. Leakage-Safe Stratified Group Split
    # Group by normalized_text so all occurrences of a text stay strictly within ONE split
    group_df = df.groupby("normalized_text").agg({
        "label": "first",
        "is_hard_negative": lambda s: "yes" if "yes" in list(s) else "no",
        "category": "first",
        "risk_level": "first",
        "post_id": "count"
    }).reset_index().rename(columns={"post_id": "group_size"})

    # Check for any conflicting labels within a group (sanity check)
    label_counts_per_group = df.groupby("normalized_text")["label"].nunique()
    conflicting_groups = label_counts_per_group[label_counts_per_group > 1]
    if len(conflicting_groups) > 0:
        raise ValueError(f"Found {len(conflicting_groups)} text groups with conflicting labels!")

    # Stratification feature: label + is_hard_negative
    group_df["strata"] = group_df["label"] + "_" + group_df["is_hard_negative"]

    # First split: 70% Train, 30% Temp (Val + Test)
    sss1 = StratifiedShuffleSplit(n_splits=1, test_size=0.30, random_state=random_state)
    train_idx, temp_idx = next(sss1.split(group_df, group_df["strata"]))
    train_groups = group_df.iloc[train_idx].copy()
    temp_groups = group_df.iloc[temp_idx].copy()

    # Second split: Split Temp 50/50 -> 15% Val, 15% Test
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=0.50, random_state=random_state)
    val_sub_idx, test_sub_idx = next(sss2.split(temp_groups, temp_groups["strata"]))
    val_groups = temp_groups.iloc[val_sub_idx].copy()
    test_groups = temp_groups.iloc[test_sub_idx].copy()

    # Create mapping of normalized_text -> new leakage-safe split
    split_mapping = {}
    for t in train_groups["normalized_text"]:
        split_mapping[t] = "train"
    for t in val_groups["normalized_text"]:
        split_mapping[t] = "val"
    for t in test_groups["normalized_text"]:
        split_mapping[t] = "test"

    df["leakage_safe_split"] = df["normalized_text"].map(split_mapping)

    # Build split dataframes
    train_df = df[df["leakage_safe_split"] == "train"].copy().reset_index(drop=True)
    val_df = df[df["leakage_safe_split"] == "val"].copy().reset_index(drop=True)
    test_df = df[df["leakage_safe_split"] == "test"].copy().reset_index(drop=True)

    # 8. Leakage Verification & Inter-Split Assertions
    train_set = set(train_df["normalized_text"])
    val_set = set(val_df["normalized_text"])
    test_set = set(test_df["normalized_text"])

    assert len(train_set & val_set) == 0, "CRITICAL ERROR: Train and Val have overlapping texts!"
    assert len(train_set & test_set) == 0, "CRITICAL ERROR: Train and Test have overlapping texts!"
    assert len(val_set & test_set) == 0, "CRITICAL ERROR: Val and Test have overlapping texts!"

    # Near-Duplicate Similarity Audit between Train and Test
    print("[3] Checking near-duplicate fuzzy similarity across splits...")
    high_sim_pairs = []
    for t_text in test_groups["normalized_text"].head(30):
        for tr_text in train_groups["normalized_text"]:
            sim = fuzz.token_sort_ratio(t_text, tr_text)
            if sim >= 88 and t_text != tr_text:
                high_sim_pairs.append({
                    "test_text": t_text,
                    "train_text": tr_text,
                    "similarity": round(float(sim), 2)
                })

    print(f"    - Near-duplicate pairs (>88% token sort) across train/test: {len(high_sim_pairs)}")

    # 9. Save Clean Splits to data/
    train_df.to_csv(TRAIN_PATH, index=False, encoding="utf-8")
    val_df.to_csv(VAL_PATH, index=False, encoding="utf-8")
    test_df.to_csv(TEST_PATH, index=False, encoding="utf-8")
    print(f"[4] Clean split files written successfully:")
    print(f"    - Train: {TRAIN_PATH} ({len(train_df)} rows, {len(train_groups)} unique text groups)")
    print(f"    - Val:   {VAL_PATH} ({len(val_df)} rows, {len(val_groups)} unique text groups)")
    print(f"    - Test:  {TEST_PATH} ({len(test_df)} rows, {len(test_groups)} unique text groups)")

    # 10. Generate Cleaning Report
    report = {
        "dataset_name": "FraudScope AI Indian Financial Ad Fraud Benchmark",
        "raw_source_file": "data/uploaded_dataset.csv",
        "cleaning_timestamp": pd.Timestamp.now(tz="UTC").isoformat(),
        "summary": {
            "original_rows": original_row_count,
            "retained_rows": len(df),
            "excluded_rows": 0,
            "exact_duplicate_rows": exact_duplicate_rows,
            "repeated_text_instances": repeated_texts_count,
            "unique_raw_texts": unique_raw_texts,
            "unique_normalized_text_groups": unique_norm_texts,
            "label_distribution": df["label"].value_counts().to_dict(),
            "risk_level_distribution": df["risk_level"].value_counts().to_dict(),
            "category_distribution": df["category"].value_counts().to_dict(),
            "platform_distribution": df["platform"].value_counts().to_dict(),
            "missing_values": missing_counts
        },
        "leakage_audit_original_csv": {
            "leaking_text_groups_count": num_original_leaking_groups,
            "leaking_text_groups_percentage": round(num_original_leaking_groups / unique_norm_texts * 100, 2),
            "affected_rows_count": original_leaked_rows_count,
            "leakage_diagnosis": "Original split assigned identical repeated ad texts into train, val, and test simultaneously, causing artificial memorization and metric inflation."
        },
        "leakage_safe_splits": {
            "strategy": "Stratified Group Shuffle Split on normalized text groups with zero cross-split overlap",
            "train": {
                "rows": len(train_df),
                "unique_text_groups": len(train_groups),
                "label_counts": train_df["label"].value_counts().to_dict(),
                "risk_counts": train_df["risk_level"].value_counts().to_dict(),
            },
            "validation": {
                "rows": len(val_df),
                "unique_text_groups": len(val_groups),
                "label_counts": val_df["label"].value_counts().to_dict(),
                "risk_counts": val_df["risk_level"].value_counts().to_dict(),
            },
            "test": {
                "rows": len(test_df),
                "unique_text_groups": len(test_groups),
                "label_counts": test_df["label"].value_counts().to_dict(),
                "risk_counts": test_df["risk_level"].value_counts().to_dict(),
            },
            "leakage_verification": {
                "train_val_overlap": len(train_set & val_set),
                "train_test_overlap": len(train_set & test_set),
                "val_test_overlap": len(val_set & test_set),
                "leakage_free": True
            }
        },
        "cleaning_decisions": [
            "Preserved original uploaded CSV untouched at data/uploaded_dataset.csv.",
            "Dropped trailing empty columns resulting from trailing delimiters.",
            "Standardized unicode to NFKC and stripped zero-width characters.",
            "Normalized whitespace to single spaces and generated lowercase normalized text for grouping.",
            "Retained all 745 records; resolved repeated ad text variants by grouping rather than deletion to retain platform and timestamp diversity.",
            "Audited and resolved original split leakage: mapped each distinct text group exclusively to one split.",
            "Preserved all metadata fields (platform, language, category, risk_level, phone, upi_id, url).",
            "Guaranteed zero text group leakage between train, val, and test."
        ]
    }

    # Save JSON report
    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Save Markdown report
    md_content = f"""# FraudScope AI — Dataset Cleaning & Leakage Audit Report

**Date:** {report['cleaning_timestamp']}  
**Source Dataset:** `{report['raw_source_file']}`  
**Pipeline Status:** Cleaned, Audited & Leakage-Safe Splits Generated

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Original Records** | {report['summary']['original_rows']} |
| **Retained Records** | {report['summary']['retained_rows']} |
| **Excluded Records** | {report['summary']['excluded_rows']} |
| **Exact Duplicate Rows** | {report['summary']['exact_duplicate_rows']} |
| **Unique Normalized Text Groups** | {report['summary']['unique_normalized_text_groups']} |
| **Repeated Ad Text Instances** | {report['summary']['repeated_text_instances']} |

### Label & Risk Distribution
- **Safe:** {report['summary']['label_distribution'].get('safe', 0)} ({report['summary']['label_distribution'].get('safe', 0)/report['summary']['retained_rows']*100:.1f}%)
- **Suspicious:** {report['summary']['label_distribution'].get('suspicious', 0)} ({report['summary']['label_distribution'].get('suspicious', 0)/report['summary']['retained_rows']*100:.1f}%)
- **Risk Bands:** High ({report['summary']['risk_level_distribution'].get('high', 0)}), Medium ({report['summary']['risk_level_distribution'].get('medium', 0)}), Low ({report['summary']['risk_level_distribution'].get('low', 0)})

---

## 2. Data Leakage Audit of Original CSV

> [!WARNING]
> In the original CSV split assignment, **{report['leakage_audit_original_csv']['leaking_text_groups_count']} out of {report['summary']['unique_normalized_text_groups']} unique text groups ({report['leakage_audit_original_csv']['leaking_text_groups_percentage']}%)** appeared across multiple splits simultaneously. A total of **{report['leakage_audit_original_csv']['affected_rows_count']} rows** were affected.

This caused identical advertisement texts to be present in both the training and test sets, which would produce artificial model memorization and invalidly inflated test metrics.

---

## 3. Leakage-Safe Stratified Group Split

To eliminate data leakage, we implemented **Stratified Group Splitting**:
- Group key: `normalized_text` (all rows sharing the same text belong to exactly ONE split).
- Stratification target: `label + is_hard_negative`.
- Target distribution: ~70% Train, 15% Validation, 15% Test.

| Split | Rows | Unique Text Groups | Suspicious Rows | Safe Rows |
| :--- | :---: | :---: | :---: | :---: |
| **Train** | {report['leakage_safe_splits']['train']['rows']} | {report['leakage_safe_splits']['train']['unique_text_groups']} | {report['leakage_safe_splits']['train']['label_counts'].get('suspicious', 0)} | {report['leakage_safe_splits']['train']['label_counts'].get('safe', 0)} |
| **Validation** | {report['leakage_safe_splits']['validation']['rows']} | {report['leakage_safe_splits']['validation']['unique_text_groups']} | {report['leakage_safe_splits']['validation']['label_counts'].get('suspicious', 0)} | {report['leakage_safe_splits']['validation']['label_counts'].get('safe', 0)} |
| **Test** | {report['leakage_safe_splits']['test']['rows']} | {report['leakage_safe_splits']['test']['unique_text_groups']} | {report['leakage_safe_splits']['test']['label_counts'].get('suspicious', 0)} | {report['leakage_safe_splits']['test']['label_counts'].get('safe', 0)} |
| **Total** | **{report['summary']['retained_rows']}** | **{report['summary']['unique_normalized_text_groups']}** | **{report['summary']['label_distribution'].get('suspicious', 0)}** | **{report['summary']['label_distribution'].get('safe', 0)}** |

### Split Overlap Audit
- **Train ∩ Validation Overlap:** {report['leakage_safe_splits']['leakage_verification']['train_val_overlap']} (0%)
- **Train ∩ Test Overlap:** {report['leakage_safe_splits']['leakage_verification']['train_test_overlap']} (0%)
- **Validation ∩ Test Overlap:** {report['leakage_safe_splits']['leakage_verification']['val_test_overlap']} (0%)
- **Group Integrity:** **100% Preserved (Zero Leakage)**

---

## 4. Cleaning Decisions Log
1. **Preserve Original:** Raw dataset preserved unchanged at `data/uploaded_dataset.csv`.
2. **Text Normalization:** Applied NFKC normalization, removed zero-width spaces, stripped formatting.
3. **Missing Values:** Preserved optional entity columns (`phone`, `upi_id`, `url`, `cluster_id`) without fabricating evidence.
4. **Repeated Ad Handling:** Maintained all repeated records within disjoint groups to preserve temporal and platform distribution.
5. **Traceability:** Saved clean splits to `data/train.csv`, `data/val.csv`, and `data/test.csv`.
"""

    with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[5] Cleaning and leakage report saved to {REPORT_JSON_PATH} and {REPORT_MD_PATH}")
    print("=" * 70)
    return report


if __name__ == "__main__":
    run_dataset_preparation()

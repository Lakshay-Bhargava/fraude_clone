# FraudScope AI — Dataset Cleaning & Leakage Audit Report

**Date:** 2026-10-13T15:53:06.033476+00:00  
**Source Dataset:** `data/uploaded_dataset.csv`  
**Pipeline Status:** Cleaned, Audited & Leakage-Safe Splits Generated

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Original Records** | 745 |
| **Retained Records** | 745 |
| **Excluded Records** | 0 |
| **Exact Duplicate Rows** | 0 |
| **Unique Normalized Text Groups** | 209 |
| **Repeated Ad Text Instances** | 536 |

### Label & Risk Distribution
- **Safe:** 400 (53.7%)
- **Suspicious:** 345 (46.3%)
- **Risk Bands:** High (245), Medium (100), Low (400)

---

## 2. Data Leakage Audit of Original CSV

> [!WARNING]
> In the original CSV split assignment, **59 out of 209 unique text groups (28.23%)** appeared across multiple splits simultaneously. A total of **557 rows** were affected.

This caused identical advertisement texts to be present in both the training and test sets, which would produce artificial model memorization and invalidly inflated test metrics.

---

## 3. Leakage-Safe Stratified Group Split

To eliminate data leakage, we implemented **Stratified Group Splitting**:
- Group key: `normalized_text` (all rows sharing the same text belong to exactly ONE split).
- Stratification target: `label + is_hard_negative`.
- Target distribution: ~70% Train, 15% Validation, 15% Test.

| Split | Rows | Unique Text Groups | Suspicious Rows | Safe Rows |
| :--- | :---: | :---: | :---: | :---: |
| **Train** | 544 | 146 | 275 | 269 |
| **Validation** | 98 | 31 | 39 | 59 |
| **Test** | 103 | 32 | 31 | 72 |
| **Total** | **745** | **209** | **345** | **400** |

### Split Overlap Audit
- **Train ∩ Validation Overlap:** 0 (0%)
- **Train ∩ Test Overlap:** 0 (0%)
- **Validation ∩ Test Overlap:** 0 (0%)
- **Group Integrity:** **100% Preserved (Zero Leakage)**

---

## 4. Cleaning Decisions Log
1. **Preserve Original:** Raw dataset preserved unchanged at `data/uploaded_dataset.csv`.
2. **Text Normalization:** Applied NFKC normalization, removed zero-width spaces, stripped formatting.
3. **Missing Values:** Preserved optional entity columns (`phone`, `upi_id`, `url`, `cluster_id`) without fabricating evidence.
4. **Repeated Ad Handling:** Maintained all repeated records within disjoint groups to preserve temporal and platform distribution.
5. **Traceability:** Saved clean splits to `data/train.csv`, `data/val.csv`, and `data/test.csv`.

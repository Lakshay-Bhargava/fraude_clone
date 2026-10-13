import os
import sys
import io
import pandas as pd
import numpy as np

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "uploaded_dataset.csv"))
print(f"Reading dataset from: {dataset_path}")

df = pd.read_csv(dataset_path, sep="\t")
print("\n=== SHAPE & COLUMNS ===")
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
print("Columns:", df.columns.tolist())

print("\n=== MISSING VALUES ===")
print(df.isnull().sum().to_string())

print("\n=== LABEL DISTRIBUTION ===")
print(df["label"].value_counts(dropna=False).to_string())

print("\n=== RISK LEVEL DISTRIBUTION ===")
print(df["risk_level"].value_counts(dropna=False).to_string())

print("\n=== CATEGORY DISTRIBUTION ===")
print(df["category"].value_counts(dropna=False).to_string())

print("\n=== PLATFORM DISTRIBUTION ===")
print(df["platform"].value_counts(dropna=False).to_string())

print("\n=== ORIGINAL SPLIT DISTRIBUTION ===")
print(df["split"].value_counts(dropna=False).to_string())

print("\n=== UNIQUE TEXTS & DUPLICATE ANALYSIS ===")
num_raw_unique = df["text"].nunique()
print(f"Total rows: {len(df)}")
print(f"Unique raw texts: {num_raw_unique}")
print(f"Exact duplicate rows (all columns identical): {df.duplicated().sum()}")
print(f"Duplicate texts (same text in multiple rows): {df.duplicated(subset=['text']).sum()}")

# Normalize text
import unicodedata
import re

def normalize_text(text: str) -> str:
    if pd.isna(text):
        return ""
    text = unicodedata.normalize("NFKC", str(text))
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

df["norm_text"] = df["text"].apply(normalize_text)
print(f"Unique normalized texts: {df['norm_text'].nunique()}")

# Leakage audit on original split:
print("\n=== DATA LEAKAGE AUDIT IN ORIGINAL SPLITS ===")
text_to_splits = df.groupby("norm_text")["split"].unique()
leaking_text_groups = text_to_splits[text_to_splits.apply(len) > 1]
print(f"WARNING: Normalized text groups crossing splits in original CSV: {len(leaking_text_groups)} out of {df['norm_text'].nunique()} total groups!")
for norm_t, splits in leaking_text_groups.head(15).items():
    cnt = len(df[df["norm_text"] == norm_t])
    lbl = df[df["norm_text"] == norm_t]["label"].unique().tolist()
    print(f"  • (Occurs {cnt}x, label={lbl}, splits={list(splits)}): '{norm_t[:70]}'")

# Check if any text group has conflicting labels (both 'safe' and 'suspicious')
conflicting_labels = df.groupby("norm_text")["label"].unique()
conflicting = conflicting_labels[conflicting_labels.apply(len) > 1]
print(f"\nText groups with conflicting labels (same text, different label): {len(conflicting)}")
if len(conflicting) > 0:
    for norm_t, lbls in conflicting.items():
        print(f"  • CONFLICT: '{norm_t[:60]}...' -> {lbls}")

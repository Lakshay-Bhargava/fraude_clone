# FraudScope AI — Architecture Overview

## System Architecture

FraudScope AI is structured as a decoupled, modern full-stack application for explainable financial threat intelligence and advertisement risk investigation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                         │
│  - Dark Cyber Forensics UI (#08090D, Space Grotesk, Inter, JetBrains)  │
│  - Public Cinematic Landing Page & Demonstration Shell                 │
│  - Advertisement Scanner (Text / Safe URL / Screenshot OCR / CSV Batch)│
│  - Interactive Threat Network (React Flow Graph)                       │
│  - Evidence Explorer, Case Management, Alert Center, Report Export     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI Engine)                        │
│  ┌────────────────────────┐      ┌──────────────────────────────────┐  │
│  │   API Routing Layer    │      │         Database Layer           │  │
│  │  - /api/ads            │      │  - SQLAlchemy 2.0 ORM            │  │
│  │  - /api/dashboard      │      │  - SQLite Engine                 │  │
│  │  - /api/cases          │      │  - Fully Relational Models       │  │
│  │  - /api/network        │      │  - Automatic Seeding             │  │
│  │  - /api/reports        │      └──────────────────────────────────┘  │
│  │  - /api/alerts         │                                            │
│  └───────────┬────────────┘                                            │
│              ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     AI Risk Analysis Pipeline                    │  │
│  │  1. Text Preprocessing (normalization, obfuscation decoding)     │  │
│  │  2. Entity Extraction (Crypto, Telegram, WhatsApp, URLs, Phones) │  │
│  │  3. Context-Aware Rule Engine (benign warning filtering)         │  │
│  │  4. ML Classifier (TF-IDF + Logistic Regression, fallback mode)  │  │
│  │  5. Composite Risk Scoring (0–100 index with calibrated bands)   │  │
│  │  6. Similarity & Duplicate Engine (RapidFuzz, normalized hashes) │  │
│  │  7. OCR Ingestion (PyTesseract with graceful fallback)           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

## Core Backend Modules
- **`app/services/text_preprocessing.py`**: Normalizes whitespace, character casing, detects leetspeak / obfuscated tokens, and cleans inputs safely without deleting evidence.
- **`app/services/entity_extraction.py`**: Regular expressions and pattern heuristics extract phone numbers, Telegram usernames, WhatsApp handles, cryptocurrency addresses, and URL hostnames.
- **`app/services/rule_engine.py`**: Identifies high-risk indicators (unauthorized bank account sales, KYC bypass, pre-loaded ATM cards, credential harvesting, money mule phrasing, advance fee demands). Crucially, detects benign educational or regulatory warnings to prevent false positives.
- **`app/services/model_service.py`**: Uses TF-IDF vectorization and Logistic Regression trained on labeled synthetic financial ad data to generate probabilistic risk signals. Falls back gracefully to rule-only analysis if scikit-learn is unavailable.
- **`app/services/risk_scoring.py`**: Blends rule-based weights and ML confidence into an explainable 0–100 Risk Score. Generates actionable risk levels (LOW, MEDIUM, HIGH) and human-readable investigation explanations.
- **`app/services/similarity_service.py`**: Calculates SHA256 exact content hashes, RapidFuzz token sort ratios for near-duplicates, and identifies shared contact identifiers or URLs across records.
- **`app/services/ocr_service.py`**: Safely attempts optical character recognition via PyTesseract; if the Tesseract binary is not installed in the host OS, returns a helpful diagnostic and allows manual text verification.

## Investigative Philosophy
A risk score is an investigative triage signal, **not** a verified legal verdict or proof of criminal activity. Analysts retain full human review control.

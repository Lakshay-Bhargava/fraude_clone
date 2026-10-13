# FraudScope AI — Detect. Analyze. Investigate.

> **AI-Powered Financial Advertisement Fraud Detection & Threat Intelligence Platform**  
> Combines statistical natural language processing, rule-based forensic heuristics, and graph entity correlation to detect, analyze, and investigate illicit financial advertisements across social media channels (Telegram, WhatsApp, Instagram, Facebook, Classifieds, and X).

---

## 🌟 Overview: What is FraudScope AI?

Cybercrime networks, illegal betting rings, and money mule syndicates routinely recruit proxies and purchase illicit banking infrastructure via social media advertisements:
- **Bank & Current Account Rental / Sale:** Pre-activated personal and corporate checking accounts offered to bypass KYC verification and route illicit cash flows.
- **ATM Cards & Pre-loaded Payment Cards:** Active debit cards with PINs advertised for immediate ATM cash-outs.
- **SIM-Linked Banking Services:** Mule bank accounts bundled with active operational SIM cards to intercept one-time passwords (OTP).
- **UPI & Merchant Handle Rentals:** Renting personal and merchant UPI handles for rapid transaction laundering.
- **Urgency & Pressure Language:** Solicitations offering unrealistic payouts with pressure language ("urgent buyers only", "rozana earning").

**FraudScope AI** inspects suspicious financial advertisements in English, Hindi, and Hinglish, extracts technical indicators (Phone numbers, UPI IDs, URLs, Telegram handles), computes a transparent **0–100 Risk Score**, highlights red-flag phrases, links related records into an interactive **Threat Cluster Network**, and generates court- and compliance-ready **Forensic Case Report PDFs**.

---

## 🔬 Dataset Preparation, Cleaning & Leakage Prevention

FraudScope AI includes a reproducible end-to-end dataset preparation and leakage-safe splitting pipeline designed to benchmark financial advertisement fraud.

### 1. Raw Dataset Audit & Leakage Diagnosis
- **Raw Dataset Source:** `data/uploaded_dataset.csv` (745 records, preserved verbatim).
- **Unique Normalized Text Groups:** 209 groups across 745 records.
- **Data Leakage Audit of Original CSV:**
  > [!WARNING]
  > In the original CSV split assignments, **59 out of the 209 unique text groups (28.2%)** appeared across multiple splits simultaneously, affecting **557 out of 745 rows**. This caused identical ad texts to appear in both training and test sets, artificially inflating test metrics through memorization.

### 2. Leakage-Safe Stratified Group Splitting
To eliminate data leakage, we implemented **Stratified Group Splitting**:
- Records are grouped by `normalized_text` (all occurrences of identical or near-equivalent text belong to exactly ONE split).
- Stratification target: `label + is_hard_negative`.
- Target distribution: ~70% Train, 15% Validation, 15% Test.

| Split | Rows | Unique Text Groups | Suspicious Rows | Safe Rows |
| :--- | :---: | :---: | :---: | :---: |
| **Train (`data/train.csv`)** | 544 | 146 | 275 | 269 |
| **Validation (`data/val.csv`)** | 98 | 31 | 39 | 59 |
| **Test (`data/test.csv`)** | 103 | 32 | 31 | 72 |
| **Total** | **745** | **209** | **345** | **400** |

- **Cross-Split Overlap:** **0 text groups** (100% disjoint, zero leakage verified).
- **Detailed Cleaning Reports:** Saved to [`data/cleaning_report.json`](file:///c:/Users/Yash%20Srivastava/Desktop/FraudScope%20AI/data/cleaning_report.json) and [`data/cleaning_report.md`](file:///c:/Users/Yash%20Srivastava/Desktop/FraudScope%20AI/data/cleaning_report.md).

### How to Run Dataset Preparation
```powershell
# Windows PowerShell
.\backend\venv\Scripts\python backend/app/ml/dataset_pipeline.py
```

---

## 🧠 Real Machine Learning Model Training & Evaluation

FraudScope AI trains a reproducible **TF-IDF + Logistic Regression** baseline model fitted strictly on the training split, and evaluates it independently on validation and test sets.

- **Feature Pipeline:** Sublinear TF-IDF Vectorizer with unigrams and bigrams (`ngram_range=(1, 2)`), `min_df=2`, `max_features=3000`.
- **Classifier:** `LogisticRegression(class_weight='balanced', C=1.0, random_state=42, max_iter=1000)`.
- **Vocabulary Size:** 572 learned n-gram tokens.
- **Top Suspicious Signals:** `"karo" (+1.30)`, `"dm" (+1.19)`, `"account" (+1.09)`, `"paisa" (+0.99)`, `"kiraye pe" (+0.95)`, `"urgent" (+0.83)`.
- **Top Benign / Protective Signals:** `"kya" (-1.47)`, `"kaise" (-1.14)`, `"update" (-0.98)`, `"process" (-0.80)`, `"apply" (-0.78)`.

### Validation Split Metrics (n = 98)
- **Accuracy:** 69.39%
- **Precision:** 56.52%
- **Recall (Suspicious):** **100.0%**
- **F1-Score:** 0.7222
- **ROC-AUC:** **1.0000**
- **PR-AUC:** **1.0000**

### Held-Out Test Split Metrics (n = 103)
- **Accuracy:** 63.11%
- **Precision:** 44.93%
- **Recall (Suspicious):** **100.0%**
- **F1-Score:** 0.6200
- **ROC-AUC:** **0.9713**
- **PR-AUC:** **0.9420**

> [!NOTE]
> High ranking power (ROC-AUC 0.9713) reflects strong statistical separation between fraud patterns and inquiries on the benchmark. Synthetic dataset performance does not establish identical real-world operational accuracy. In production, FraudScope AI pairs this statistical model with a rule engine and contextual benign mitigation.

### Model Artifact Locations
- **Serialized Model Pipeline:** [`backend/models_cache/baseline_model.joblib`](file:///c:/Users/Yash%20Srivastava/Desktop/FraudScope%20AI/backend/models_cache/baseline_model.joblib)
- **Model Metadata & Metrics:** [`backend/models_cache/model_metadata.json`](file:///c:/Users/Yash%20Srivastava/Desktop/FraudScope%20AI/backend/models_cache/model_metadata.json)
- **Detailed Evaluation Report:** [`backend/models_cache/evaluation_report.md`](file:///c:/Users/Yash%20Srivastava/Desktop/FraudScope%20AI/backend/models_cache/evaluation_report.md)

### How to Train and Evaluate the Model
```powershell
.\backend\venv\Scripts\python backend/app/ml/train_model.py
```

---

## 🏷️ Separation of Demo Data from Real Scans

FraudScope AI strictly isolates benchmark records from live user investigations:
- **Provenance Tagging:** All 745 benchmark records are marked with `is_demo=True` and `data_source="SYNTHETIC_DATASET"`.
- **Live User Scans:** Newly submitted scans from `/scanner` are persisted with `is_demo=False` and `data_source="LIVE_SCAN"`.
- **Dashboard Provenance Toggle:** The intelligence dashboard provides a toggle between **"All Records"** (Benchmark + Live) and **"Live Scans Only"**.
- **Visual Indicators:** Prominent purple `DEMO BENCHMARK` and emerald `LIVE SCAN` badges are rendered on the Dashboard, Flagged Posts Hub, Evidence Drawer, and Dossier views.
- **Idempotent Importer:** Running the import script repeatedly is idempotent (`0 duplicates created`).

### How to Import the Dataset Idempotently
```powershell
cd backend
..\backend\venv\Scripts\python -m app.ml.import_dataset_to_db
```

---

## 🧭 Navigation & Core Workspaces

1. **Dashboard** (`/console`):
   - Welcome header, Data Provenance selector (`All Records` vs `Live Scans Only`), and real-time database sync.
   - **Active ML Forensic Engine Card**: Live model status, version (`fraudscope-tfidf-lr-v1.0`), vocabulary size, and test ROC-AUC.
   - KPI metrics: Total Analyzed, High-Risk Alerts, Active Clusters, Entities Extracted.
   - Recharts Visualizations: Posts scanned over time, Risk distribution, Platform comparison.
   - Recent Flagged Advertisements table with provenance badges and Evidence Drawer action.
2. **Advertisement Scanner** (`/scanner`):
   - Multilingual detection presets, text input, platform selector, optional URL, OCR screenshot upload.
   - Displays Composite Risk Score (0-100), Risk Level badge, plain-language triage explanation, and recommended action.
   - **Machine Learning Classifier Evaluation Card**: Predicted class (`SUSPICIOUS` / `SAFE`), statistical probability, and token-level TF-IDF feature contributions.
   - Triggered heuristic rules and extracted technical indicators (Phone, UPI, URLs).
   - Instant PDF case report generation.
3. **Flagged Posts Hub** (`/flagged-posts`):
   - Comprehensive searchable index with pagination, risk filters, status filters, and **Provenance Filter** (`All`, `Live Only`, `Demo Only`).
   - Snippets with highlighted red-flag keywords in English, Hindi, and Hinglish.
4. **Threat Clusters & Networks** (`/network`):
   - Interactive React Flow threat intelligence graph connecting advertisements, phone numbers, UPI IDs, and domains.
5. **Reports Archive** (`/reports`):
   - Downloadable case reports with export capabilities.

---

## 🚀 Running the Application Locally

### 1. Backend Server (FastAPI)
```powershell
# From project root
.\backend\venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- **API Base:** `http://127.0.0.1:8000`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`

### 2. Frontend Server (Vite + React + Tailwind)
```powershell
cd frontend
npm run dev
```
- **Web Application:** `http://localhost:5173`

---

## 🧪 Testing and Verification

### Backend Automated Test Suite
Runs all 29 automated unit and integration tests (including dataset cleaning, zero leakage verification, model inference, provenance tags, and API endpoints):
```powershell
.\backend\venv\Scripts\python -m pytest backend/tests
```
**Result:** `29 passed in 23.51s` with 0 failures.

### Frontend Production Build
Validates TypeScript types and packages the production bundle:
```powershell
cd frontend
npm run build
```
**Result:** `✓ built in 2.88s` with 0 compilation errors.

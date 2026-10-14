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
   - Recharts Visualizations: Posts scanned over time with Scanned (#2F4B45) & Flagged (#D9482B), Donut risk distribution with centered total, Platform comparison.
   - Clickable Stat Cards navigating directly to filtered views (Ads analyzed, High-risk alerts, Active clusters, Extracted entities).
   - Compact ML Forensic Strip showing model version, vocabulary, ROC-AUC, and disjoint unseen-wording test accuracy.
   - Replay Live Feed Simulation streaming posts client-side with Play/Pause and 1x/2x/5x speed controls.
   - Priority Syndicate Queue ranking top 5 fraud clusters with instant "Open case" action.
2. **Top Navigation & Context Bar Layout**:
   - 48px sticky header with navigation tabs, command bar trigger ("Ctrl K"), single primary "Scan post" action, language switcher (EN | HI), notifications, and user avatar.
   - Thin contextual filter bar with Platform, Risk, Date-range chips, and status indication ("Synthetic data · Model online").
   - Below 900px responsive hamburger navigation.
3. **Flagged Posts Hub & Contrast-Fixed Table** (`/flagged-posts`):
   - Strict WCAG AA contrast compliance: text never turns dark or invisible; table rows hover to slightly darker paper (`#EDE5D3`).
   - Sticky headers, 2-line snippets with keyword highlighting, risk badges, indicator chips, status chips, and pagination.
   - Right-side slide-over Evidence Detail Drawer with full text, rule explanations, false-positive reporting, and instant PDF generation.
4. **Threat Clusters & Networks** (`/network`):
   - D3-force graph with collision avoidance, `#22B8D4` rounded square hubs, risk-sized ad nodes, bridge ad rings, and cluster halos.
5. **Command Palette (`Ctrl+K` / `Cmd+K`)**:
   - Universal search across posts, phone numbers, UPI handles, and URLs, plus quick shortcuts.
6. **Bilingual i18n (English / Hindi)**:
   - Full localization support with persistent language choice in `localStorage`.

---

## 🎨 Design Tokens & Accessibility

| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `--bg` | `#F2ECDF` | Warm paper page background |
| `--card` | `#FBF7EE` | Surface card background |
| `--sidebar` | `#E9E1D0` | Surface panel background |
| `--primary` | `#D9482B` | Burnt vermilion primary action |
| `--on-primary` | `#FFFFFF` | Text on primary |
| `--accent` | `#2F4B45` | Deep forest accent ink |
| `--text` | `#26221D` | High-contrast dark ink text |
| `--muted` | `#6F675B` | Readable secondary text |
| `--border` | `#D9CFBA` | Clean 1px surface border |
| `--radius` | `4px` | Controlled radius (no pill shapes) |
| `--table-hover` | `#EDE5D3` | Paper row hover (never dark grey) |
| High Risk | `#E5484D` (text `#A8341C` on `#FDE8E8`) | High severity indicator |
| Medium Risk | `#F5A524` (text `#8A5A00` on `#FEF3D6`) | Medium severity indicator |
| Low Risk | `#2FA97C` (text `#1D6B4F` on `#E6F7F0`) | Safe / low severity indicator |
| Indicator Chip | text `#0F6E7A` on `#D8EEF0` | High-contrast technical chip |

All pairs tested and verified for WCAG AA compliance (contrast ratio $\ge 4.5:1$).

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
Runs all 51 automated unit, integration, and WCAG AA contrast ratio tests:
```powershell
.\backend\venv\Scripts\python -m pytest backend/tests -v
```

### Frontend Production Build
Validates TypeScript types and packages the production bundle:
```powershell
cd frontend
npm run build
```

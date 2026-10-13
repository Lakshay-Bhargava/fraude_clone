# FraudScope AI

> **Detect. Analyze. Investigate.**  
> *Follow the Signal. Find the Fraud.*

**FraudScope AI** is an explainable AI-assisted financial advertisement threat intelligence and cyber-forensics investigation platform. It empowers financial crime analysts, compliance investigators, and security teams to rapidly triage large volumes of suspicious advertisements, extract forensic evidence, uncover hidden campaign clusters, and manage structured cases.

---

## 1. Problem Statement
Suspicious advertisements across social channels, messaging apps, and forums frequently advertise illicit access to unauthorized bank accounts ("mule accounts"), pre-loaded ATM cards with stolen PINs, credential-harvesting phishing portals, and advance-fee loan schemes. 

Reviewing high volumes of unstructured advertisements manually is slow and prone to oversight. **FraudScope AI** bridges this gap by providing:
- Automated natural-language heuristic parsing and baseline machine learning inference.
- Multi-channel entity extraction (Telegrams, WhatsApp, phone numbers, crypto tags, URL domains).
- An explainable, calibrated **0–100 Risk Index** with transparent signal attribution.
- False-positive suppression for benign educational, journalistic, and regulatory advisories.
- Near-duplicate clustering and an interactive **React Flow Threat Network**.
- Complete case management with an immutable audit trail.

> **Investigative Philosophy:** A risk score is an investigative triage signal, **not** legal proof of fraud or verified criminal conduct. All dispositions are subject to human analyst review.

---

## 2. Core Capabilities & Key Features
- **Cinematic Dark Cyber Forensics UI:** Designed in palette `#08090D`, Space Grotesk, Inter, and JetBrains Mono with scanning reticles and aperture branding.
- **Multimodal Scanner:**
  - Raw Text Input with live character counter.
  - Safe URL String parsing (extracted without initiating outbound network requests).
  - Screenshot Ingestion with Optical Character Recognition (PyTesseract) and offline fallback.
  - CSV Bulk Ingestion with per-row parsing and validation.
- **Explainable AI Risk Engine:**
  - Context-aware heuristic rules (Account Takeover, Card Fraud, Phishing, Mule Recruitment, Advance Fee).
  - Benign Context Mitigation preventing false positives on consumer scam alerts and legitimate disclosures.
  - TF-IDF + Logistic Regression baseline probabilistic text classification.
- **Evidence Explorer:** Interactive character highlight of triggered phrases, evidence inventory, related campaign matches, and human review disposition workflow (`NEW`, `NEEDS_REVIEW`, `UNDER_INVESTIGATION`, `ESCALATED`, `CLOSED`, `FALSE_POSITIVE`).
- **Threat Network Visualization:** Interactive React Flow graph linking advertisements, syndicated cases, and shared communication channels.
- **Case Management:** Create prioritized cases (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), assign analysts, append investigation notes, and link candidate ads.
- **Security Alert Center:** Persistent triage alerts with severity ratings and review toggles.
- **Forensic Reports & Exports:** Executive summaries, printable report layouts, and sanitized CSV exports immune to spreadsheet formula injection (CWE-1236).

---

## 3. Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS + Cyber Forensics tokens
- **Routing:** React Router v7
- **Graph Visualization:** `@xyflow/react` (React Flow v12)
- **Charts:** Recharts
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.12 + FastAPI + Uvicorn
- **Validation:** Pydantic v2
- **Database ORM:** SQLAlchemy 2.0 + SQLite
- **Machine Learning & NLP:** scikit-learn (TF-IDF + Logistic Regression), Pandas, NumPy
- **Text Similarity:** RapidFuzz (Token Sort Ratio)
- **Computer Vision:** PyTesseract + Pillow
- **Testing:** Pytest + FastAPI TestClient

---

## 4. Repository Structure

```
FraudScope-AI/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (ads, dashboard, cases, network, alerts, reports, settings)
│   │   ├── core/            # Core settings & environment config
│   │   ├── database/        # SQLite engine & SQLAlchemy session
│   │   ├── models/          # Relational ORM models (Advertisement, AnalysisResult, Evidence, Case, Alert)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # AI Pipeline (preprocessing, entity_extraction, rule_engine, model_service, risk_scoring)
│   │   └── main.py          # Application entrypoint & lifespan lifecycle
│   ├── tests/               # Pytest automated test suite
│   ├── models_cache/        # Serialized ML pipeline artifacts
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (Logo, RiskBadge, StatusBadge, Navbar, AppShell)
│   │   ├── pages/           # LandingPage, Dashboard, Scanner, Investigation, Ads, Network, Cases, Alerts, Reports, Settings
│   │   ├── services/        # Frontend API client
│   │   ├── types/           # TypeScript interfaces
│   │   ├── index.css        # Cyber grid & scanning animations
│   │   └── App.tsx          # Client-side router
│   ├── index.html           # Fonts and metadata
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data/
│   └── sample_ads.csv       # Deterministic synthetic test dataset
├── docs/
│   ├── architecture.md      # Detailed system architecture
│   └── risk_scoring.md      # Mathematical scoring formulation
├── pytest.ini               # Pytest configuration
├── .gitignore
└── README.md
```

---

## 5. Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Python**: 3.10, 3.11, or 3.12
- *(Optional)* **Tesseract-OCR**: For screenshot OCR processing. If not installed, the platform automatically provides graceful fallback notices.

---

## 6. Installation & Setup

### A. Backend Setup
1. Open terminal in the project root:
   ```bash
   cd "c:\Users\Yash Srivastava\Desktop\FraudScope AI"
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv backend/venv
   # Windows PowerShell:
   .\backend\venv\Scripts\Activate.ps1
   # Linux / macOS:
   source backend/venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### B. Frontend Setup
1. In a separate terminal, navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```

---

## 7. Running the Application

### 1. Start Backend Server
From the project root:
```bash
.\backend\venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### 2. Start Frontend Dev Server
From `frontend` directory:
```bash
npm run dev
```
- Access application: `http://localhost:5173/`

---

## 8. Database Initialization & Seeding
The backend initializes the SQLite database schema automatically on startup through FastAPI's lifespan event. 

If the database is empty, it automatically ingests the synthetic dataset from `data/sample_ads.csv`, computes initial risk scores, creates demonstration cases, and generates security alerts.

To reset the database cleanly:
```powershell
Remove-Item fraudscope.db
# Restart backend to regenerate tables and seed data automatically
```

---

## 9. Running Tests

### Backend Automated Test Suite
From the project root with the virtual environment:
```bash
.\backend\venv\Scripts\python -m pytest backend/tests
```
Tests verify:
- Health check endpoint.
- Suspicious advertisement analysis and entity extraction.
- **Benign warning context mitigation (confirming zero false positives on educational advisories).**
- Input validation (empty text rejection).
- Duplicate and near-duplicate detection.
- Case lifecycle, status updates, and note appending.
- Alert review state transitions.
- CSV export formatting and formula injection sanitization.
- Threshold boundary validation.

### Frontend Typecheck & Production Build
```bash
cd frontend
npm run build
```

---

## 10. AI Risk Scoring Engine Details

The risk index is a calibrated composite score between **0 and 100**:
- **0–34 (LOW RISK):** Standard promotional language, verified disclosures, or recognized educational scam alerts.
- **35–64 (MEDIUM RISK):** Speculative return claims (e.g. "35% weekly ROI"), unverified trading bots, or high urgency.
- **65–100 (HIGH RISK):** Pre-loaded ATM cards, KYC bypass / bank account sales, sensitive credential requests, or money mule recruitment.

$$S = \min\left(100, \max\left(0, W_{rules} + W_{ml} - C_{benign}\right)\right)$$

Where $W_{rules}$ aggregates triggered heuristic weights, $W_{ml}$ reflects Logistic Regression prediction probability ($P(\text{suspicious}) \times 35$), and $C_{benign}$ deducts up to 65 points when educational/warning markers are detected.

---

## 11. Security & Responsible Use

1. **Safe URL Evaluation:** Submitted URLs are analyzed as static strings without visiting or fetching remote endpoints.
2. **Formula Injection Sanitization:** Spreadsheet cells starting with `=`, `+`, `-`, or `@` are neutralized with single quotes.
3. **No Scraping:** System operates purely on analyst-submitted text or authorized test fixtures.
4. **Local Demo Authentication:** Analyst login is simplified for demonstration purposes; production deployments should integrate enterprise SSO.
5. **No Production Claims:** Machine learning signals are trained on synthetic baseline demonstration fixtures.

---

## 12. License
Created for hackathon demonstration. Open source under the MIT License.

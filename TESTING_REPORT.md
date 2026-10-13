# FraudScope AI — Redesign Verification and Testing Report

**Date of Execution:** October 13, 2026  
**Environment:** Windows (PowerShell), Python 3.12.5 (FastAPI / Uvicorn), Node.js (Vite + React 19 + TypeScript)  
**Database:** SQLite (`fraudscope.db`)  
**Backend Endpoint:** `http://127.0.0.1:8000`  
**Frontend Endpoint:** `http://localhost:5173`

---

## 1. Executive Summary

FraudScope AI underwent a complete frontend redesign into a modern, beginner-friendly cybersecurity threat intelligence platform. The user interface was restructured with:
- **Floating Card System:** Layered surfaces (`#141C2B`, elevated `#192438`, input surface `#0E1522`), border radius 16–20px, subtle shadows, and low-contrast borders (`rgba(185, 200, 220, 0.12)`).
- **Exact Design Tokens:**
  - Background: `#090D16` (Main), `#0D1320` (Alternate)
  - Brand: Primary orange `#FF7547`, Orange hover `#FF8A61`, Subtle glow `rgba(255, 117, 71, 0.14)`
  - Risk Indicators: High risk `#FF5964`, Medium risk `#F4BC52`, Low risk `#45D6A3`
  - Typography: Space Grotesk (headings), Inter (body), JetBrains Mono (identifiers/scores)
- **AppShell & Navigation:** Collapsible desktop sidebar (expanded w-64 vs collapsed w-20 with tooltips), strictly 5 primary navigation items (`Dashboard`, `Scan Advertisement`, `Investigations`, `Threat Network`, `Reports`), secondary access for Alerts (with live counter) and Settings, breadcrumb header, and mobile drawer.
- **Cinematic Landing Page:** Hero headline *"Follow the Signal. Find the Fraud."*, workflow progression preview, 3 core feature floating cards, score interpretation guide, and responsible forensics disclaimer.
- **Simplified Dashboard:** Welcome banner with prominent "Scan an Advertisement" button, 4 floating metric cards (*Total Scanned*, *High Risk*, *Medium Risk*, *Low Risk*) fed by real API data, and responsive recent scans table.
- **Streamlined Scanner:** Large textarea (`placeholder="Paste a suspicious advertisement here..."`), 4 one-click test presets (*Bank Account Offer*, *Pre-loaded ATM Cards*, *Safe Advisory*, *Money Mule Recruitment*), expandable OCR/CSV options, composite risk progress indicator, plain-language explanation, and link to full dossier.
- **Investigation Details (8 Dedicated Cards):** Header breadcrumbs, prominent risk overview card, original ad text with flagged phrase highlights, human-readable evidence cards, extracted contacts with copy buttons, related ads, next steps checklist, disposition updater form, and collapsible advanced diagnostics.
- **Threat Network & Reports:** React Flow network container with node inspector panel, relationship explanation, and sanitized CSV reports protected against spreadsheet formula injection (CWE-1236).

All 11 automated backend tests pass, frontend TypeScript builds with 0 errors, and browser subagent end-to-end testing verified all interactive workflows.

---

## 2. Test Execution & Results

### 2.1 Backend Automated Pytest Suite
**Command:**
```powershell
.\backend\venv\Scripts\python -m pytest backend/tests -v
```

**Results:**
```
============================= test session starts =============================
platform win32 -- Python 3.12.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Yash Srivastava\Desktop\FraudScope AI
configfile: pytest.ini
collected 11 items

backend/tests/test_analysis.py::test_analyze_suspicious_ad PASSED        [  9%]
backend/tests/test_analysis.py::test_empty_input_rejected PASSED         [ 18%]
backend/tests/test_analysis.py::test_benign_warning_not_false_positive PASSED [ 27%]
backend/tests/test_analysis.py::test_risk_score_bounds PASSED            [ 36%]
backend/tests/test_cases.py::test_case_workflow PASSED                   [ 45%]
backend/tests/test_cases.py::test_alerts_review PASSED                   [ 54%]
backend/tests/test_cases.py::test_csv_export PASSED                      [ 63%]
backend/tests/test_health.py::test_health_check PASSED                   [ 72%]
backend/tests/test_rules_and_settings.py::test_duplicate_detection PASSED [ 81%]
backend/tests/test_rules_and_settings.py::test_settings_threshold_validation PASSED [ 90%]
backend/tests/test_rules_and_settings.py::test_threat_network_endpoint PASSED [100%]

======================= 11 passed, 1 warning in 10.42s ========================
```
*Status:* **PASSED (11/11 tests)**

---

### 2.2 Frontend TypeScript Check & Production Build
**Command:**
```powershell
cd frontend
npm run build
```

**Results:**
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2087 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.57 kB │ gzip:   0.83 kB
dist/assets/index-DXUJtjCv.css   33.97 kB │ gzip:   6.78 kB
dist/assets/index-WDtGMrqu.js   575.32 kB │ gzip: 169.93 kB
✓ built in 1.93s
```
*Status:* **PASSED (0 errors, 0 broken imports)**

---

### 2.3 Browser Subagent Visual & E2E Verification
A full automated browser session was conducted across all redesigned pages:
1. **Landing Page (`/`)**: Loaded deep midnight background, typography hierarchy, feature floating cards, and workflow step indicators without layout shift.
2. **Dashboard (`/console`)**: Loaded real statistics (*Total Scanned*, *High Risk*, *Medium Risk*, *Low Risk*) and recent scan entries. Verified responsive table and "Scan an Advertisement" button.
3. **Scanner (`/scanner`)**: Loaded sample preset (*Bank Account Offer*), clicked *Analyze Advertisement*, verified 91/100 risk score, progress indicator bar, plain-language explanation, rule triggers, and extracted Telegram identifier.
4. **Investigation Dossier (`/investigations/...`)**: Navigated to the record, confirmed phrase highlighting, copy controls, next steps checklist, and disposition update form.
5. **Threat Network (`/network`)**: Loaded interactive React Flow canvas, node legend, and side inspector panel.
6. **Reports (`/reports`)**: Verified executive summary metrics, printable layout, and secure CSV download trigger.

*Recording Artifact:* `redesign_e2e_walkthrough_1791879371900.webp`

---

## 3. Sample Scans & Detection Verifications

| Test Sample | Input Text Snippet | Classification | Composite Score | Detection Attributions |
| :--- | :--- | :--- | :--- | :--- |
| **Bank Account Offer** | "GUARANTEED UNCHECKED BANK ACCOUNTS FOR SALE! No KYC verification needed... Telegram @FastCashDrop" | **HIGH RISK** | **91.2 / 100** | Rule: *Unauthorized Account Sale / KYC Bypass* (+42), *Offshore Contact* (+15), ML model signal |
| **Cloned ATM Cards** | "Pre-loaded ATM Debit Cards ready to cash out at any terminal. Balance $10,000 guaranteed with PIN included..." | **HIGH RISK** | **85.5 / 100** | Rule: *Cloned / Pre-loaded Payment Card Offer* (+45), *Offshore Contact* (+15) |
| **Safe Advisory** | "SCAM ALERT from the Consumer Protection Bureau: Be alert to online ads offering pre-loaded debit cards... report to hotline" | **LOW RISK** | **17.6 / 100** | Benign educational context mitigation applied (-65 discount) |
| **Money Mule Recruitment** | "Rent your bank account and make $1,500/day passive income! Receive wire transfers and forward 90% via crypto..." | **HIGH RISK** | **78.4 / 100** | Rule: *Money Mule Recruitment / Wire Laundering* (+45) |

---

## 4. Key Fixes Applied During Redesign

1. **Polymorphic Identifier Routing:** Updated FastAPI advertisement endpoints (`/{id}`) and frontend API methods to accept alphanumeric string identifiers (e.g. `AD-SCAN-xxxxxx`) in addition to integer IDs, eliminating 422 Unprocessable Entity routing issues.
2. **Collapsible Desktop Navigation:** AppShell now allows collapsing the sidebar to an icon-only rail (w-20) with interactive tooltips, giving analysts more screen width for evidence and graphs.
3. **Plain-Language Warning Categories:** Replaced internal screaming-snake-case category codes (`ACCOUNT_TAKEOVER`, `MONEY_LAUNDERING`) with intuitive, human-friendly titles in the evidence dossier.
4. **Visual Score Progress Bar:** Added a calibrated progress bar displaying the 0–100 score relative to low (35) and high (65) triage thresholds.
5. **Investigative Notice Disclaimers:** Added explicit notices across all detection views clarifying that risk scores are triage prioritization signals requiring human analyst review.

---

## 5. Known Limitations & Responsible AI Guidelines

1. **Synthetic Training Baseline:** The baseline machine learning classifier (TF-IDF + Logistic Regression) was trained on deterministic synthetic advertisement fixtures for hackathon demonstration. Real-world financial advertisements may exhibit novel evasion phrasing.
2. **Optional Tesseract Dependency:** Optical Character Recognition requires local Tesseract binaries. If Tesseract is not present on the host OS, the upload handler returns a friendly informational message rather than crashing.
3. **Static URL Parsing:** Submitted URLs are evaluated as static strings for domain attribution and are never actively visited or resolved, ensuring analyst workstation safety.

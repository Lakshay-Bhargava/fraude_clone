# FraudScope AI Test Suite Documentation

## Test Categories

The automated test suite evaluates both security safeguards and core AI reasoning components.

### 1. Analysis & Scoring Tests (`backend/tests/test_analysis.py`)
- `test_analyze_suspicious_ad`: Verifies detection of unauthorized bank account sales, KYC bypass promises, and score elevation to HIGH RISK (&ge; 65/100).
- `test_empty_input_rejected`: Validates input rejection on blank/whitespace payloads with HTTP 400/422.
- `test_benign_warning_not_false_positive`: **Critical requirement** ensuring consumer protection warnings and educational alerts are discounted and classified as LOW RISK (&lt; 35/100).
- `test_risk_score_bounds`: Asserts that calculated scores fall strictly within [0.0, 100.0].

### 2. Case Management & Reports (`backend/tests/test_cases.py`)
- `test_case_workflow`: Tests full case creation lifecycle, ad linking, analyst note appending, and status progression.
- `test_alerts_review`: Verifies alert review state persistence.
- `test_csv_export`: Asserts generation of RFC 4180 compliant CSV exports with formula injection protection.

### 3. Heuristics, Duplicates & Network (`backend/tests/test_rules_and_settings.py`)
- `test_duplicate_detection`: Confirms exact duplicate campaigns trigger duplicate alerts via normalized content hashes.
- `test_settings_threshold_validation`: Tests backend boundary validation for custom risk thresholds.
- `test_threat_network_endpoint`: Validates generation of connected nodes and edges for the React Flow threat network.

### Running the Test Suite
```bash
.\backend\venv\Scripts\python -m pytest backend/tests
```

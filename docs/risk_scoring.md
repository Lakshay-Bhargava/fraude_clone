# FraudScope AI — Risk Scoring Methodology

## Scoring Model (0–100 Scale)

The FraudScope AI Risk Engine produces a normalized index between **0 and 100** based on a transparent, multi-stage evaluation pipeline.

### Risk Indicator Bands
- **0–34 (LOW RISK)**:
  - Standard promotional offers from verified or standard institutions.
  - Transparent fees, realistic interest rates (APY/APR), standard credit disclosures.
  - Educational fraud warnings or security advisories (recognized via contextual negative-filtering).
- **35–64 (MEDIUM RISK)**:
  - Unrealistic or speculative yield guarantees (e.g. "30% weekly ROI").
  - Unverified private trading signals or investment clubs.
  - High-pressure language without overt criminal triggers.
- **65–100 (HIGH RISK)**:
  - Bank account sales ("mule accounts", "no KYC verification required").
  - Cloned or pre-loaded ATM cards with PIN guarantees.
  - Credential harvesting (requests for banking PIN, OTP, card CVV).
  - Explicit money mule recruitment (renting bank accounts to move wire transfers).
  - Advance fee loan demands (demanding prepaid fees before loan release).

### Scoring Formula
The score $S$ is computed through a composite model:

$$S = \min\left(100, \max\left(0, W_{rules} + W_{ml} - C_{benign}\right)\right)$$

Where:
- $W_{rules}$: Aggregated rule weights triggered by distinct heuristic patterns (each rule carries a calibrated weight between 15 and 45 points).
- $W_{ml}$: Machine Learning risk signal contribution ($P(\text{suspicious}) \times 40$), derived from TF-IDF + Logistic Regression classification.
- $C_{benign}$: Contextual benign adjustment factor (up to 70 points deducted when educational, regulatory, or journalistic warning context is detected).

### Investigative Note
A high score is an investigative alert indicating the presence of suspicious linguistic indicators and anomalies. It is **never** legal proof of guilt or verified fraudulent conduct. All decisions require human analyst review.

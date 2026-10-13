"""
FRAUDSCOPE AI — Calibrated Hybrid Risk Scoring Engine
=====================================================
Blends deterministic rule heuristics, contextual NLP indicators, and
statistical machine learning probabilities into a calibrated 0-100 risk score.
Includes strict gates against false positives on educational content,
banking advisories, and benign consumer inquiries.
Classifies cases as Safe, Needs Review, or Suspicious, with clear explanations.
"""

from typing import Dict, Any, List, Optional


def calculate_composite_risk(
    rule_results: Dict[str, Any],
    model_available: bool = False,
    model_signal: Optional[float] = None,
    model_class: Optional[str] = None,
    model_version: Optional[str] = None,
    model_tokens: Optional[List[Dict[str, Any]]] = None,
    is_duplicate: bool = False
) -> Dict[str, Any]:
    """
    Computes an explainable, bounded risk score (0 to 100) combining
    rule-based weights, contextual protections, and ML classification signals.
    Returns calibrated risk score, risk level, classification (Safe, Needs Review, Suspicious),
    and explainable investigator dossier rationale.
    """
    is_financial = rule_results.get("is_financial_relevance", True)
    raw_rule_score = rule_results.get("raw_rule_score", 0)
    is_benign = rule_results.get("is_benign_context", False)
    benign_matches = rule_results.get("benign_matches", [])
    triggered_rules = rule_results.get("triggered_rules", [])

    # 1. Non-Financial Gate: retail, clothing, general non-banking posts are 0 risk
    if not is_financial:
        return {
            "risk_score": 0.0,
            "risk_level": "LOW",
            "classification": "SAFE",
            "model_available": model_available,
            "model_signal": model_signal,
            "model_score": round(model_signal * 100, 1) if model_signal is not None else None,
            "model_class": "safe",
            "model_version": model_version or "fraudscope-v2.0",
            "model_tokens": model_tokens or [],
            "recommended_review_action": "Standard commercial advertisement. Conforms to retail/apparel/service promotion; no financial fraud escalation required.",
            "explanation": "Financial Relevance Gate: Content is an ordinary non-financial commercial advertisement. No solicitation of banking infrastructure, accounts, or payments detected. Model risk score is a triage indicator, not confirmed evidence of criminal fraud."
        }

    # 2. Rule Component (capped at 65 points)
    rule_component = min(65.0, float(raw_rule_score))

    # 3. Machine Learning Signal Calibration (up to 35 points)
    # ML probability is treated as an investigative signal, not guaranteed proof of fraud.
    ml_component = 0.0
    if model_available and model_signal is not None:
        if raw_rule_score > 0:
            # When heuristic rules are triggered, ML amplifies confidence up to 35 points
            ml_component = float(model_signal) * 35.0
        elif model_signal >= 0.85:
            # Highly confident statistical fraud pattern without specific keyword trigger: elevates to Medium band for analyst triage
            ml_component = float(model_signal) * 45.0
        elif model_signal >= 0.65:
            # Moderate statistical signal without heuristic match: triage in review band
            ml_component = float(model_signal) * 25.0
        else:
            # Low or benign signal: keep minimal
            ml_component = float(model_signal) * 8.0
    else:
        # Graceful rule fallback if model is unavailable
        rule_component = min(100.0, float(raw_rule_score) * 1.25)

    composite_score = rule_component + ml_component

    # 4. Duplicate Campaign Boost
    if is_duplicate and composite_score >= 35.0:
        composite_score = min(100.0, composite_score + 5.0)

    explanation_parts = []

    # 5. Contextual Benign Advisory Mitigation
    # If official advisory, regulatory notice, or consumer inquiry is recognized
    if is_benign:
        discount = 75.0
        composite_score = max(2.0, min(15.0, composite_score - discount))
        explanation_parts.append(
            f"BENIGN CONTEXT MITIGATION DETECTED: Content contains recognized educational, regulatory, or customer inquiry markers ({', '.join(benign_matches[:2])}). "
            "Keywords are evaluated in protective or informational context rather than illicit intent."
        )

    # 6. Strict Bounding (0.0 to 100.0)
    final_score = round(max(0.0, min(100.0, composite_score)), 1)

    # 7. Risk Level and 3-Way Classification Assignment
    # Safe, Needs Review, Suspicious
    if is_benign:
        risk_level = "LOW"
        classification = "SAFE"
        recommended_action = "Educational / protective content. Retain as reference benign sample; no fraud escalation required."
    elif final_score >= 70.0:
        risk_level = "HIGH"
        classification = "SUSPICIOUS"
        recommended_action = "High-priority triage required. Open investigation case, verify entity linkages, and inspect payment endpoints."
    elif final_score >= 35.0 or (model_signal is not None and 0.45 <= model_signal <= 0.65):
        risk_level = "MEDIUM"
        classification = "NEEDS_REVIEW"
        recommended_action = "Ambiguous or moderate risk indicators detected. Secondary analyst inspection advised; cross-reference with known threat networks."
    else:
        risk_level = "LOW"
        classification = "SAFE"
        recommended_action = "Low risk indicator. Retain in investigative index for baseline comparison; no immediate escalation required."

    # 8. Human-Readable Explanation Building
    if triggered_rules and not is_benign:
        rule_names = [r["rule_name"] for r in triggered_rules]
        explanation_parts.append(
            f"Flagged by {len(triggered_rules)} investigative rule(s): {'; '.join(rule_names)}. "
            f"Highest priority indicators: {', '.join([r['category'] for r in triggered_rules])}."
        )
    elif not triggered_rules and not is_benign:
        explanation_parts.append(
            "No illicit unauthorized financial solicitation heuristics triggered. Content conforms to standard promotional parameters."
        )

    if model_available and model_signal is not None:
        pct = round(model_signal * 100, 1)
        cls_str = model_class.upper() if model_class else classification
        explanation_parts.append(
            f"ML Classifier ({model_version or 'v2.0'}) reported {pct}% suspicion signal (Predicted Class: {cls_str})."
        )
        if model_tokens:
            top_toks = [f"{t['token']} ({'+' if t['contribution'] > 0 else ''}{t['contribution']})" for t in model_tokens[:3]]
            explanation_parts.append(f"Key contributing tokens: {', '.join(top_toks)}.")
    else:
        explanation_parts.append("ML model offline; score calculated via deterministic heuristic engine.")

    explanation_parts.append(
        "Notice: The risk score is an algorithmic investigative triage indicator, not confirmed legal proof of criminal activity."
    )

    full_explanation = " ".join(explanation_parts)

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "classification": classification,
        "model_available": model_available,
        "model_signal": model_signal,
        "model_score": round(model_signal * 100, 1) if model_signal is not None else None,
        "model_class": classification.lower() if is_benign else (model_class or classification.lower()),
        "model_version": model_version or "fraudscope-v2.0",
        "model_tokens": model_tokens or [],
        "recommended_review_action": recommended_action,
        "explanation": full_explanation
    }

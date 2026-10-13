from typing import Dict, Any, List

def calculate_composite_risk(
    rule_results: Dict[str, Any],
    model_available: bool,
    model_signal: float = None,
    is_duplicate: bool = False
) -> Dict[str, Any]:
    """
    Computes an explainable, calibrated risk score (0-100) combining
    rule-based weights, contextual indicators, and machine learning signals.
    """
    raw_rule_score = rule_results.get("raw_rule_score", 0)
    is_benign = rule_results.get("is_benign_context", False)
    benign_matches = rule_results.get("benign_matches", [])
    triggered_rules = rule_results.get("triggered_rules", [])

    # Base rule score (capped at 65 from rules alone)
    rule_component = min(65.0, float(raw_rule_score))

    # ML component (up to 35 points)
    ml_component = 0.0
    if model_available and model_signal is not None:
        # Scale model probability (0.0 - 1.0) to 0 - 35 points
        ml_component = float(model_signal) * 35.0
    else:
        # If ML is not available, scale rule component slightly to maintain 0-100 dynamic range
        rule_component = min(100.0, float(raw_rule_score) * 1.25)

    composite_score = rule_component + ml_component

    # Duplicate boost (slight signal boost if part of a repeated campaign)
    if is_duplicate:
        composite_score = min(100.0, composite_score + 5.0)

    # Contextual Benign Adjustment:
    # If the text is an educational advisory or scam warning from a legitimate body,
    # significantly discount the score so educational content is NOT falsely flagged as fraud!
    explanation_parts = []

    if is_benign:
        discount = 65.0
        composite_score = max(5.0, composite_score - discount)
        explanation_parts.append(
            f"BENIGN CONTEXT MITIGATION DETECTED: Content contains recognized educational or regulatory warning markers ({', '.join(benign_matches[:2])}). "
            "Keywords are evaluated in protective context rather than malicious intent."
        )

    # Clamp final score between 0 and 100
    final_score = round(max(0.0, min(100.0, composite_score)), 1)

    # Risk level classification
    if final_score >= 65.0:
        risk_level = "HIGH"
        recommended_action = "High-priority triage required. Open investigation case, verify domain/contact linkages, and examine associated financial signals."
    elif final_score >= 35.0:
        risk_level = "MEDIUM"
        recommended_action = "Secondary analyst inspection advised. Cross-reference with known threat networks and monitor campaign frequency."
    else:
        risk_level = "LOW"
        recommended_action = "Low risk indicator. Retain in investigative index for baseline comparison; no immediate escalation required."

    # Build human-readable explanation
    if triggered_rules and not is_benign:
        rule_names = [r["rule_name"] for r in triggered_rules]
        explanation_parts.append(
            f"Flagged by {len(triggered_rules)} investigative rule(s): {'; '.join(rule_names)}. "
            f"Highest priority indicators: {', '.join([r['category'] for r in triggered_rules])}."
        )
    elif not triggered_rules and not is_benign:
        explanation_parts.append(
            "No high-risk unauthorized financial heuristics triggered. Content conforms to standard promotional parameters."
        )

    if model_available and model_signal is not None:
        explanation_parts.append(
            f"Machine learning classifier reported {round(model_signal * 100, 1)}% suspicion probability based on linguistic token distribution."
        )
    else:
        explanation_parts.append("ML model offline or unavailable; score calculated via deterministic heuristic engine.")

    full_explanation = " ".join(explanation_parts)

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "recommended_review_action": recommended_action,
        "explanation": full_explanation
    }

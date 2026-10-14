import re
from typing import List, Dict, Any, Tuple

# Suspicious pattern rules
SUSPICIOUS_RULES = [
    {
        "id": "RULE_UNCHECKED_ACCOUNT",
        "name": "Unauthorized Account Sale / KYC Bypass",
        "category": "ACCOUNT_TAKEOVER",
        "weight": 42,
        "explanation": "Content promotes pre-activated bank or checking accounts bypassing standard Know Your Customer (KYC) identity verification.",
        "patterns": [
            r"\b(?:unchecked|pre-activated|aged|stealth)\s+bank\s+accounts?\b",
            r"\bbank\s+accounts?\s+for\s+sale\b",
            r"\bno\s+kyc(?:\s+verification)?(?:\s+needed|\s+required)?\b",
            r"\bfully\s+activated\s+(?:business\s+and\s+personal|checking)\s+accounts?\b",
            r"\bmule\s+accounts?\b",
            r"\baccount\s+(?:available\s+)?for\s+rent\b",
            r"\bcurrent\s+accounts?\s+available(?:\s+for\s+rent)?\b",
            r"\b(?:bank\s+)?account\s+kiraye\s+pe\b",
            r"\bbank\s+account\s+rent\s+par\b",
            r"\bfresh\s+current(?:\s+accounts?)?\b",
            r"\b(?:savings|current|bank)\s+(?:a/c|akaunt|acc0unt|account)\s+(?:bikau|ready)\b",
            r"\b(?:savings|current|bank)\s+(?:a/c|akaunt|acc0unt|account)\s+for\s+sale\b",
            r"\bkhata\s+kiraye\s+pe\b",
            r"\baccount\s+chahiye,?\s+paisa\s+milega\b",
            r"\b(?:savings|current|bank)\s+account\s+with\s+pin\s*\+\s*sim\b",
        ]
    },
    {
        "id": "RULE_PRELOADED_CARDS",
        "name": "Cloned / Pre-loaded Payment Card Offer",
        "category": "CARD_FRAUD",
        "weight": 45,
        "explanation": "Content advertises illicitly loaded ATM debit cards, cloned cards, or dump cards with guaranteed PINs.",
        "patterns": [
            r"\bpre-?loaded\s+atm\s+(?:debit\s+)?cards?\b",
            r"\bcash\s+out\s+(?:at\s+any\s+terminal|methods?)\b",
            r"\bbalance\s+\$[\d,]+\s+guaranteed\b",
            r"\bwith\s+pin\s+included\b",
            r"\bcard\s+\+\s+pin\b",
            r"\bcloned\s+cards?\b",
            r"\bcard\s+dumps?\b",
            r"\batm\s+cards?\s+(?:bikau|for\s+sale|kiraye\s+pe|rent\s+par|with\s+account|with\s+pin)\b",
            r"\bcard\s+aur\s+pin\s+available\b",
            r"\bdebit\s+card\s+and\s+account\s+access\s+available\b",
            r"\b(?:atm|debit|credit)\s+card\s+kiraye\s+pe\b",
            r"\b(?:atm|debit|credit)\s+card\s+bechno\s+hai\b",
            r"\bsasta\s+(?:atm|debit|credit)\s+(?:card|kard)\b",
        ]
    },
    {
        "id": "RULE_SIM_LINKED_BANKING",
        "name": "SIM-Linked Banking / Account Sale",
        "category": "ACCOUNT_TAKEOVER",
        "weight": 44,
        "explanation": "Content advertises bank accounts sold alongside physical SIM cards registered to unauthorized holders.",
        "patterns": [
            r"\blinked\s+sim\s+ke\s+saath\s+account\b",
            r"\bbank\s+account\s+with\s+linked\s+sim\b",
            r"\blinked\s+sim\b",
            r"\bsim-?linked\s+banking\b",
            r"\bpin\s*\+\s*sim\s*(?:\+\s*cheque\s*book)?\b",
            r"\bpin\s+aur\s+sim\b",
        ]
    },
    {
        "id": "RULE_UPI_RENTAL",
        "name": "UPI Identifier / Gateway Rental",
        "category": "MONEY_LAUNDERING",
        "weight": 40,
        "explanation": "Content requests or offers UPI IDs or merchant handles for routing untraceable financial transfers.",
        "patterns": [
            r"\bupi\s+(?:id\s+)?(?:access|for\s+rent|rent\s+par)\b",
            r"\bmerchant\s+upi\s+available\b",
            r"\bupi\s+handle\s+available\b",
        ]
    },
    {
        "id": "RULE_CREDENTIAL_HARVESTING",
        "name": "Sensitive Credential Phishing / Harvesting",
        "category": "PHISHING",
        "weight": 50,
        "explanation": "Solicits confidential banking credentials (online PIN, card CVV, OTP) under false security alerts.",
        "patterns": [
            r"\bverify\s+(?:your\s+)?(?:online\s+banking\s+)?pin\b",
            r"\bfull\s+card\s+cvv\b",
            r"\bsecurity\s+certificate\s+has\s+expired\b",
            r"\bprevent\s+immediate\s+account\s+freeze\b",
            r"\bprovide\s+(?:your\s+)?(?:one-time\s+passcode|otp|password)\b",
            r"\breply\s+with\s+your\s+credentials\b",
        ]
    },
    {
        "id": "RULE_MONEY_MULE",
        "name": "Money Mule Recruitment / Wire Laundering",
        "category": "MONEY_LAUNDERING",
        "weight": 45,
        "explanation": "Proposes renting personal bank accounts to receive external wire transfers and forward funds via cryptocurrency.",
        "patterns": [
            r"\brent\s+your\s+bank\s+account\b",
            r"\breceive\s+(?:daily\s+)?incoming\s+wire\s+transfers?\b",
            r"\bforward\s+\d+%\s+via\s+crypto\b",
            r"\bmake\s+\$[\d,]+/day\s+passive\s+income\b",
            r"\b100%\s+legal[,\s]+no\s+risk\s+to\s+you\b",
        ]
    },
    {
        "id": "RULE_ADVANCE_FEE",
        "name": "Advance Fee / Upfront Collateral Loan Solicitation",
        "category": "ADVANCE_FEE",
        "weight": 35,
        "explanation": "Demands an advance payment or upfront fee before disbursing promised loans or emergency credit lines.",
        "patterns": [
            r"\badvance\s+processing\s+fee\b",
            r"\bupfront\s+collateral\s+fee\b",
            r"\bpay\s+\$[\d,]+\s+(?:advance|upfront|fee)\s+to\s+unlock\b",
            r"\bwithout\s+credit\s+checks?\b",
            r"\bregardless\s+of\s+bankruptcy\s+or\s+credit\s+score\b",
        ]
    },
    {
        "id": "RULE_PRESSURE_TACTICS",
        "name": "Urgent Pressure & Artificial Scarcity",
        "category": "SOCIAL_ENGINEERING",
        "weight": 18,
        "explanation": "Uses psychological urgency or artificial scarcity to accelerate victim compliance before verification.",
        "patterns": [
            r"\bact\s+before\s+midnight\b",
            r"\blimited\s+slots\s+(?:left\s+)?today\b",
            r"\blimited\s+slots?\b",
            r"\bonly\s+\d+\s+cards?\s+remaining\b",
            r"\bfreeze\s+within\s+\d+\s+hours?\b",
            r"\bdon't\s+miss\s+this\s+opportunity\b",
            r"\bhurry[,\s]+few\s+slots\s+remaining\b",
            r"\burgent\s+buyers?(?:\s+only)?\b",
            r"\bpayment\s+after\s+verification\b",
        ]
    },
    {
        "id": "RULE_UNREALISTIC_RETURNS",
        "name": "Unrealistic Investment Guarantee",
        "category": "SPECULATIVE_SCHEME",
        "weight": 28,
        "explanation": "Claims extraordinary guaranteed returns (e.g., >30% weekly) with purported zero investment risk.",
        "patterns": [
            r"\b\d+%\s+(?:daily|weekly)\s+returns?\b",
            r"\bearn\s+daily\s+[₹$]?[\d,]+",
            r"\bcompletely\s+risk-?free\b",
            r"\bproprietary\s+ai\s+arbitrage\s+bot\b",
            r"\bprivate\s+signal\s+group\b",
        ]
    },
    {
        "id": "RULE_SHADOW_CONTACT",
        "name": "Offshore & Non-Traceable Contact Channel",
        "category": "EVASION",
        "weight": 20,
        "explanation": "Directs interaction strictly through encrypted offshore channels, discrete shipping, or crypto-only payment.",
        "patterns": [
            r"\bship\s+(?:worldwide\s+)?discreetly\b",
            r"\bwire\s+transfer\s+or\s+crypto\s+payment\s+only\b",
            r"\boffshore\s+(?:bank\s+)?accounts?\b",
            r"\bcontact\s+@[\w_]+\s+on\s+telegram\b",
            r"\bjoin\s+(?:now\s+)?(?:on\s+)?telegram\b",
            r"\btelegram\s+@[\w_]+\b",
        ]
    }
]

# Benign Educational & Regulatory Context Indicators
BENIGN_WARNING_PATTERNS = [
    r"\bscam\s+alert\b",
    r"\bconsumer\s+protection\b",
    r"\bbe\s+alert\s+to\s+online\s+ads\b",
    r"\blegitimate\s+financial\s+institutions\s+will\s+never\b",
    r"\breport\s+suspicious\s+ads\s+to\b",
    r"\bhow\s+to\s+protect\s+(?:your\s+)?(?:small\s+business|finances|family)\b",
    r"\bfinancial\s+crime\s+watch\b",
    r"\bviolates\s+federal\s+law\b",
    r"\bcybersecurity\s+tip(?:\s+of\s+the\s+day)?\b",
    r"\bremember\s+that\s+no\s+legitimate\s+bank\b",
    r"\bnever\s+(?:provide|share)\s+(?:your\s+)?(?:netbanking\s+|online\s+banking\s+)?(?:one-time\s+passcode|otp|pin|password|cvv|credentials?)\b",
    r"\b(?:rbi|sebi|police|government|official)\s+(?:official\s+)?(?:advisory|notice|warning|guideline|circular|portal|app)\b",
    r"\bfdic-?insured\b",
    r"\bsubject\s+to\s+credit\s+review\b",
    r"\bofficial\s+banking\s+portal\b",
    r"\b(?:fraud|scam|dhokha|thagi)\s+(?:se\s+)?(?:bachein|bacho|savdhan|satark)\b",
    r"\bmana\s+karein\b",
    r"\bsavdhan\s+rahein\b",
    r"\balert\s+rahein\b",
    r"\bpolice\s+(?:me\s+)?(?:shikayat|report)\b",
    r"\bcyber\s*crime(?:\s+portal|\s+helpline)?\b",
    r"\b(?:call\s+)?1930\b",
    r"\bit\s+is\s+illegal\b",
    r"\bbeware\s+of\s+(?:ads|fraud(?:ulent)?|scams?|offers?|fake)\b",
    r"\breport\s+such\s+(?:posts|ads|messages)\b",
    r"\b(?:kho\s+gaya|gum\s+ho\s+gaya|chori\s+ho\s+gaya)\b",
    r"\blost\s+my\s+(?:atm|card|debit\s+card|phone|passbook)\b",
    r"\b(?:card|account)\s+block\s+(?:karwaye|kaise\s+kare|karein)\b",
    r"\bunblock\s+kaise\s+kare\b",
    r"\bbranch\s+timings?\b",
    r"\bopen\s+(?:a\s+)?(?:new\s+)?(?:savings|current|bank)\s+account\s+in\s+(?:your\s+)?branch\b",
    r"\bofficial\s+banking\s+app\b",
    r"\bdaily\s+rewards\b",
]

# Financial Domain Relevance Gate Indicators
FINANCIAL_RELEVANCE_PATTERNS = [
    r"\b(?:bank|banking|banker|account|accounts|checking|savings|current|mule)\b",
    r"\b(?:card|cards|atm|debit|credit|cvv|pin|otp|passcode|password)\b",
    r"\b(?:loan|loans|lending|credit\s+line|collateral|advance\s+fee)\b",
    r"\b(?:upi|wallet|payment|paytm|gpay|phonepe|transfer|remittance)\b",
    r"\b(?:wire\s+transfer|cash\s+out|cashout|payout|passive\s+income)\b",
    r"\b(?:crypto|cryptocurrency|bitcoin|usdt|arbitrage|forex|yield|trading\s+bot)\b",
    r"\b(?:investment|returns?|interest|apr|apy|deposit|dividend)\b",
    r"\b(?:kyc|identity\s+verification|credentials?|security\s+alert)\b",
    r"\b(?:freeze|frozen|unfreeze|unlock\s+account)\b",
]

def check_financial_relevance(text: str) -> Tuple[bool, List[str]]:
    """
    Evaluates whether the advertisement content is relevant to financial solicitation,
    banking, loans, accounts, or payment instruments.
    Returns (is_relevant: bool, matched_terms: List[str]).
    Ordinary non-financial advertisements (clothing, restaurant, retail) return False.
    """
    matches = []
    for pattern in FINANCIAL_RELEVANCE_PATTERNS:
        found = re.findall(pattern, text, re.IGNORECASE)
        for term in found:
            t_lower = term.lower()
            if t_lower not in matches:
                matches.append(t_lower)
    return (len(matches) > 0, matches)

def evaluate_rules(text: str) -> Dict[str, Any]:
    """
    Evaluates rule patterns against the normalized text.
    Passes text through financial relevance gate and detects benign educational context.
    Returns triggered rules, raw score, benign context detection, and financial relevance.
    """
    # 1. Financial-Fraud Relevance Gate
    is_financially_relevant, financial_markers = check_financial_relevance(text)

    # 2. Check for Benign Educational / Regulatory Warning Context
    is_benign = False
    benign_matches = []
    for pattern in BENIGN_WARNING_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            is_benign = True
            benign_matches.append(match.group(0))

    triggered_rules = []
    suspicious_phrases = []
    total_rule_weight = 0

    # 3. Evaluate Suspicious Rules (only if financially relevant)
    if is_financially_relevant:
        for rule in SUSPICIOUS_RULES:
            matched_in_rule = []
            for pattern in rule["patterns"]:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    phrase = match.group(0)
                    if phrase not in matched_in_rule:
                        matched_in_rule.append(phrase)
                    if phrase not in suspicious_phrases:
                        suspicious_phrases.append(phrase)

            if matched_in_rule:
                weight = rule["weight"]
                total_rule_weight += weight
                triggered_rules.append({
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "category": rule["category"],
                    "weight": weight,
                    "matched_phrases": matched_in_rule,
                    "explanation": rule["explanation"]
                })

    return {
        "is_financial_relevance": is_financially_relevant,
        "financial_markers": financial_markers,
        "triggered_rules": triggered_rules,
        "suspicious_phrases": suspicious_phrases,
        "raw_rule_score": total_rule_weight,
        "is_benign_context": is_benign,
        "benign_matches": benign_matches
    }

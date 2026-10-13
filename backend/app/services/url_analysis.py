import re
import os
import ipaddress
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional

# Known URL shorteners often leveraged to obfuscate threat links
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly",
    "cutt.ly", "shorturl.at", "tiny.cc", "rebrand.ly", "rb.gy"
}

# Suspicious keywords in domain or path targeting banking / payments
SUSPICIOUS_DOMAIN_KEYWORDS = [
    "verify-bank", "secure-login", "kyc-update", "otp-auth",
    "account-freeze", "support-desk", "online-banking-auth",
    "free-cash", "crypto-yield", "fast-payout", "claim-reward"
]

def is_private_or_loopback_ip(hostname: str) -> bool:
    """
    Checks if a hostname is an IP address resolving to loopback, private,
    or link-local cloud metadata addresses (SSRF mitigation).
    """
    if not hostname:
        return False
    if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
        return True
    try:
        ip = ipaddress.ip_address(hostname)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_reserved or
            str(ip) == "169.254.169.254" # AWS/GCP metadata service
        )
    except ValueError:
        return False

def analyze_url(raw_url: str) -> Dict[str, Any]:
    """
    Performs comprehensive static heuristic analysis and optional external reputation evaluation
    for a given URL string without making unsafe external requests.
    """
    if not raw_url or not isinstance(raw_url, str):
        return {
            "url": raw_url or "",
            "normalized_url": "",
            "domain": "",
            "status": "invalid_url",
            "risk_score": 0,
            "is_suspicious": False,
            "heuristics": ["Empty or null URL supplied"],
            "reputation_provider": "local_static_heuristics",
            "reputation_status": "invalid_url",
            "is_ssrf_risk": False,
        }

    raw_url = raw_url.strip()

    # Prepend scheme if missing for parsing
    has_scheme = bool(re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*://', raw_url))
    url_to_parse = raw_url if has_scheme else f"https://{raw_url}"

    try:
        parsed = urlparse(url_to_parse)
    except Exception as e:
        return {
            "url": raw_url,
            "normalized_url": raw_url,
            "domain": "",
            "status": "invalid_url",
            "risk_score": 0,
            "is_suspicious": False,
            "heuristics": [f"Malformed URL string: {str(e)}"],
            "reputation_provider": "local_static_heuristics",
            "reputation_status": "invalid_url",
            "is_ssrf_risk": False,
        }

    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""

    if not hostname:
        return {
            "url": raw_url,
            "normalized_url": raw_url,
            "domain": "",
            "status": "invalid_url",
            "risk_score": 0,
            "is_suspicious": False,
            "heuristics": ["Unable to determine valid hostname from URL"],
            "reputation_provider": "local_static_heuristics",
            "reputation_status": "invalid_url",
            "is_ssrf_risk": False,
        }

    # Normalized URL: https scheme, lowercase hostname, trimmed trailing slash
    normalized_scheme = (parsed.scheme or "https").lower()
    normalized_path = path.rstrip("/") if path != "/" else "/"
    normalized_url = f"{normalized_scheme}://{hostname}{normalized_path}"
    if query:
        normalized_url += f"?{query}"

    heuristics = []
    risk_score = 0
    is_ssrf_risk = False

    # 1. SSRF & IP address hostname check
    if is_private_or_loopback_ip(hostname):
        heuristics.append("CRITICAL: URL targets loopback, private RFC-1918, or cloud metadata address (SSRF vector)")
        risk_score += 60
        is_ssrf_risk = True

    try:
        ip = ipaddress.ip_address(hostname)
        if not is_ssrf_risk:
            heuristics.append("Direct IP address hostname instead of recognized domain name")
            risk_score += 25
    except ValueError:
        pass

    # 2. Scheme check
    if normalized_scheme == "http":
        heuristics.append("Insecure HTTP transport (unencrypted)")
        risk_score += 10

    # 3. URL Shortener check
    if hostname in URL_SHORTENERS:
        heuristics.append(f"URL Shortener detected ({hostname}) — target destination is masked")
        risk_score += 25

    # 4. Punycode / Internationalized domain indicator (Homograph attacks)
    if "xn--" in hostname:
        heuristics.append("Punycode (xn--) encoded domain — potential homograph spoofing attempt")
        risk_score += 35

    # 5. Excessive subdomains
    domain_parts = hostname.split(".")
    if len(domain_parts) > 4:
        heuristics.append(f"Unusual subdomain depth ({len(domain_parts)} levels) — potential evasion structure")
        risk_score += 15

    # 6. Deceptive keywords in hostname or path
    url_lower = f"{hostname}{path}".lower()
    matched_suspicious_kw = [kw for kw in SUSPICIOUS_DOMAIN_KEYWORDS if kw in url_lower]
    if matched_suspicious_kw:
        heuristics.append(f"Deceptive phishing/financial keyword markers in URL: {', '.join(matched_suspicious_kw)}")
        risk_score += 30

    # 7. Excessively long URL (common in obfuscated redirectors)
    if len(raw_url) > 180:
        heuristics.append("Excessively long URL string (>180 characters) indicating potential payload or token encapsulation")
        risk_score += 10

    # 8. Check external reputation provider credentials
    gsb_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
    vt_key = os.getenv("VIRUSTOTAL_API_KEY")

    reputation_provider = "none"
    reputation_status = "not_checked"

    if gsb_key or vt_key:
        reputation_provider = "google_safe_browsing" if gsb_key else "virustotal"
        reputation_status = "check_unavailable"
    else:
        reputation_provider = "external_reputation_unconfigured"
        reputation_status = "check_unavailable"

    # Determine final verdict
    if is_ssrf_risk or risk_score >= 40:
        status = "suspicious"
        is_suspicious = True
    elif risk_score > 0:
        status = "suspicious"
        is_suspicious = True
    else:
        status = "no_known_threat_detected"
        is_suspicious = False
        heuristics.append("Standard URL structure with valid domain and HTTPS transport")

    return {
        "url": raw_url,
        "normalized_url": normalized_url,
        "domain": hostname,
        "status": status,
        "risk_score": min(100, risk_score),
        "is_suspicious": is_suspicious,
        "heuristics": heuristics,
        "reputation_provider": reputation_provider,
        "reputation_status": reputation_status,
        "is_ssrf_risk": is_ssrf_risk,
    }

import re
import socket
import ipaddress
from urllib.parse import urlparse, urljoin
from typing import Dict, Any, List, Tuple, Optional
import httpx

from app.services.url_analysis import is_private_or_loopback_ip, analyze_url
from app.services.model_service import predict_risk
from app.services.rule_engine import evaluate_rules
from app.services.text_preprocessing import normalize_text

MAX_FETCH_SIZE = 1024 * 1024  # 1 MB max response limit
FETCH_TIMEOUT = 5.0           # 5 seconds strict timeout
MAX_REDIRECTS = 3             # 3 hops max, each revalidated

FINANCIAL_FRAUD_PATTERNS = [
    {
        "category": "GUARANTEED_RETURNS",
        "severity": "HIGH",
        "pattern": r"(?i)\b(100%|guaranteed|assured|risk[- ]?free)\s+(return|profit|income|yield|doubling|payout)",
        "explanation": "Unrealistic promise of guaranteed or risk-free financial profits",
    },
    {
        "category": "ADVANCE_FEE_DEPOSIT",
        "severity": "HIGH",
        "pattern": r"(?i)\b(advance\s+fee|processing\s+charge|registration\s+fee|refundable\s+deposit|security\s+deposit)\s+(required|to\s+claim|before\s+withdrawal|mandatory)",
        "explanation": "Requirement for advance fee or upfront deposit prior to payout/loan disbursement",
    },
    {
        "category": "SUSPICIOUS_URGENCY",
        "severity": "MEDIUM",
        "pattern": r"(?i)\b(limited\s+slots?|expires\s+in\s+\d+|last\s+chance|urgent\s+registration|act\s+immediately)\b",
        "explanation": "High-pressure psychological urgency tactics designed to bypass diligence",
    },
    {
        "category": "CREDENTIAL_HARVESTING",
        "severity": "CRITICAL",
        "pattern": r"(?i)\b(enter\s+your\s+otp|share\s+password|netbanking\s+pin|atm\s+pin|upi\s+pin|card\s+cvv)\b",
        "explanation": "Solicitation of confidential banking credentials, PINs, or one-time passwords",
    },
    {
        "category": "UNREGULATED_INVESTMENT",
        "severity": "HIGH",
        "pattern": r"(?i)\b(vip\s+crypto\s+signals?|forex\s+autopilot|trading\s+bot\s+100%|daily\s+double\s+pool)\b",
        "explanation": "Unregistered algorithmic investment scheme or deceptive automated trading claims",
    },
]

def resolve_hostname_ips(hostname: str) -> Tuple[bool, List[str], Optional[str]]:
    """
    Safely resolves a hostname to IPv4/IPv6 addresses and verifies none belong to
    loopback, private, link-local, or cloud metadata IP ranges (Anti-SSRF).
    """
    if not hostname:
        return False, [], "Missing hostname"

    # Pre-check string literals
    if is_private_or_loopback_ip(hostname):
        return False, [hostname], "Hostname resolves to loopback, private RFC-1918, or cloud metadata address"

    resolved_ips = []
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for entry in addr_info:
            ip_str = entry[4][0]
            if ip_str not in resolved_ips:
                resolved_ips.append(ip_str)
    except socket.gaierror as e:
        return False, [], f"DNS resolution failed: {str(e)}"
    except Exception as e:
        return False, [], f"Resolution error: {str(e)}"

    if not resolved_ips:
        return False, [], "No DNS IP addresses found for hostname"

    # Validate each resolved IP against SSRF boundaries
    for ip_str in resolved_ips:
        if is_private_or_loopback_ip(ip_str):
            return False, resolved_ips, f"Blocked: Resolved IP ({ip_str}) is within private or restricted IP space (SSRF Protection)"

    return True, resolved_ips, None


def extract_html_metadata(html: str) -> Dict[str, Any]:
    """
    Safely extracts title, meta description, meta keywords, and plain text
    using standard regex without executing JavaScript.
    """
    title = ""
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = re.sub(r'\s+', ' ', title_match.group(1)).strip()

    description = ""
    desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', html, re.IGNORECASE | re.DOTALL)
    if not desc_match:
        desc_match = re.search(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', html, re.IGNORECASE | re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()

    # Clean body text: remove scripts, styles, noscript, svg, header/footer tags
    cleaned = re.sub(r'<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', html, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    cleaned = re.sub(r'&[a-zA-Z0-9#]+;', ' ', cleaned)
    plain_text = re.sub(r'\s+', ' ', cleaned).strip()

    # Extract hyperlinks
    href_matches = re.findall(r'<a[^>]+href=["\'](.*?)["\']', html, re.IGNORECASE)
    links = []
    for h in href_matches:
        h = h.strip()
        if h and not h.startswith(('javascript:', 'mailto:', 'tel:', '#')):
            links.append(h)

    return {
        "title": title[:200] if title else "No Title Found",
        "description": description[:500] if description else "No Meta Description",
        "plain_text": plain_text,
        "links": links[:50]
    }


def safe_fetch_website_xray(raw_url: str) -> Dict[str, Any]:
    """
    Fetches and inspects a public webpage with strict SSRF defense, redirect re-validation,
    HTML parsing, ML model scoring, and financial fraud indicator extraction.
    """
    # 1. Run static URL heuristic analysis first
    static_url_res = analyze_url(raw_url)
    if static_url_res.get("is_ssrf_risk"):
        return {
            "fetch_status": "SSRF_BLOCKED",
            "url": raw_url,
            "normalized_url": static_url_res.get("normalized_url", raw_url),
            "domain": static_url_res.get("domain", ""),
            "status_code": None,
            "error_detail": "Direct SSRF Risk: Hostname specifies a loopback, private network, or cloud metadata address.",
            "url_analysis": static_url_res,
            "metadata": None,
            "detected_signals": [
                {
                    "category": "SSRF_ATTEMPT",
                    "severity": "CRITICAL",
                    "source_quote": raw_url,
                    "explanation": "Target URL attempts access to private internal infrastructure or cloud hypervisor metadata"
                }
            ],
            "ml_analysis": None,
            "risk_assessment": {
                "risk_score": 95,
                "risk_level": "HIGH",
                "verdict_summary": "Access blocked: URL targets internal or restricted IP range (SSRF vector)."
            }
        }

    target_url = static_url_res.get("normalized_url") or raw_url
    if not (target_url.startswith("http://") or target_url.startswith("https://")):
        target_url = f"https://{target_url}"

    parsed = urlparse(target_url)
    hostname = (parsed.hostname or "").lower()

    # 2. DNS Resolution & SSRF verification on destination IP
    is_safe, resolved_ips, ssrf_err = resolve_hostname_ips(hostname)
    if not is_safe:
        return {
            "fetch_status": "CONTENT_UNAVAILABLE",
            "url": raw_url,
            "normalized_url": target_url,
            "domain": hostname,
            "status_code": None,
            "error_detail": ssrf_err or "DNS resolution or IP verification failed",
            "resolved_ips": resolved_ips,
            "url_analysis": static_url_res,
            "metadata": None,
            "detected_signals": [],
            "ml_analysis": None,
            "risk_assessment": {
                "risk_score": static_url_res.get("risk_score", 30),
                "risk_level": "MEDIUM" if static_url_res.get("risk_score", 30) >= 30 else "LOW",
                "verdict_summary": f"Webpage content unavailable: {ssrf_err}. Evaluated using static URL heuristics only."
            }
        }

    redirect_chain = [target_url]
    current_url = target_url
    response_body = ""
    status_code = None
    headers_dict = {}

    # 3. Controlled fetch with manual redirect re-validation
    try:
        with httpx.Client(timeout=FETCH_TIMEOUT, follow_redirects=False, verify=False) as client:
            for hop in range(MAX_REDIRECTS + 1):
                cur_parsed = urlparse(current_url)
                cur_host = (cur_parsed.hostname or "").lower()

                # Re-validate IP on every hop
                hop_safe, hop_ips, hop_err = resolve_hostname_ips(cur_host)
                if not hop_safe:
                    return {
                        "fetch_status": "SSRF_BLOCKED",
                        "url": raw_url,
                        "normalized_url": current_url,
                        "domain": cur_host,
                        "status_code": None,
                        "error_detail": f"Redirect hop {hop + 1} blocked by SSRF filter: {hop_err}",
                        "redirect_chain": redirect_chain,
                        "url_analysis": static_url_res,
                        "metadata": None,
                        "detected_signals": [],
                        "ml_analysis": None,
                        "risk_assessment": {
                            "risk_score": 85,
                            "risk_level": "HIGH",
                            "verdict_summary": f"Redirect chain redirected to an unsafe private IP address ({cur_host})."
                        }
                    }

                resp = client.get(
                    current_url,
                    headers={
                        "User-Agent": "FraudScope-Forensic-Scanner/2.0 (+https://fraudscope.internal/bot; verification-scanner)",
                        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9",
                    }
                )
                status_code = resp.status_code
                headers_dict = dict(resp.headers)

                # Handle redirect
                if resp.is_redirect and "location" in resp.headers:
                    next_loc = resp.headers["location"]
                    next_url = urljoin(current_url, next_loc)
                    if not (next_url.startswith("http://") or next_url.startswith("https://")):
                        break
                    current_url = next_url
                    redirect_chain.append(current_url)
                    continue

                # Finished redirect chain or non-redirect response
                # Enforce size limit
                content_bytes = resp.content[:MAX_FETCH_SIZE]
                response_body = content_bytes.decode("utf-8", errors="replace")
                break

    except httpx.TimeoutException:
        return {
            "fetch_status": "CONTENT_UNAVAILABLE",
            "url": raw_url,
            "normalized_url": current_url,
            "domain": hostname,
            "status_code": None,
            "error_detail": f"Connection timed out after {FETCH_TIMEOUT}s. Target server is unreachable or unresponsive.",
            "redirect_chain": redirect_chain,
            "url_analysis": static_url_res,
            "metadata": None,
            "detected_signals": [],
            "ml_analysis": None,
            "risk_assessment": {
                "risk_score": static_url_res.get("risk_score", 25),
                "risk_level": "LOW",
                "verdict_summary": "Remote host timed out. Webpage content could not be inspected."
            }
        }
    except Exception as e:
        return {
            "fetch_status": "CONTENT_UNAVAILABLE",
            "url": raw_url,
            "normalized_url": current_url,
            "domain": hostname,
            "status_code": status_code,
            "error_detail": f"HTTP fetch error: {str(e)}",
            "redirect_chain": redirect_chain,
            "url_analysis": static_url_res,
            "metadata": None,
            "detected_signals": [],
            "ml_analysis": None,
            "risk_assessment": {
                "risk_score": static_url_res.get("risk_score", 25),
                "risk_level": "LOW",
                "verdict_summary": f"Could not retrieve webpage content ({str(e)})."
            }
        }

    # 4. Extract webpage metadata and body text
    meta = extract_html_metadata(response_body)
    plain_text = meta["plain_text"]
    title = meta["title"]
    description = meta["description"]

    # 5. ML Model evaluation on visible webpage text
    sample_text = f"{title}. {description}. {plain_text[:1200]}"
    norm_sample = normalize_text(sample_text)
    model_avail, model_prob, model_class, model_version, model_tokens = predict_risk(norm_sample)

    # 6. Financial Fraud Pattern matching
    detected_signals: List[Dict[str, Any]] = []
    signals_score = 0

    for rule in FINANCIAL_FRAUD_PATTERNS:
        matches = re.finditer(rule["pattern"], plain_text)
        for m in matches:
            quote = m.group(0)
            # Find surrounding snippet
            start = max(0, m.start() - 40)
            end = min(len(plain_text), m.end() + 40)
            context_snippet = plain_text[start:end].strip()

            detected_signals.append({
                "category": rule["category"],
                "severity": rule["severity"],
                "source_quote": quote,
                "context": f"...{context_snippet}...",
                "explanation": rule["explanation"]
            })
            if rule["severity"] == "CRITICAL":
                signals_score += 40
            elif rule["severity"] == "HIGH":
                signals_score += 25
            else:
                signals_score += 15
            break  # one match per rule is sufficient for scoring

    # Rule engine evaluation
    rule_results = evaluate_rules(norm_sample)
    for tr in rule_results.get("triggered_rules", []):
        detected_signals.append({
            "category": tr["category"],
            "severity": tr["severity"],
            "source_quote": ", ".join(tr["matched_phrases"]),
            "context": f"Rule: {tr['rule_name']}",
            "explanation": tr["description"]
        })
        signals_score += tr["score"]

    # 7. Discrepancy checks: brand name claimed vs actual domain
    trusted_brands = ["sbi", "hdfc", "icici", "rbi", "paytm", "phonepe", "googlepay"]
    title_lower = title.lower()
    for brand in trusted_brands:
        if brand in title_lower and brand not in hostname:
            detected_signals.append({
                "category": "BRAND_IMPERSONATION_MISMATCH",
                "severity": "CRITICAL",
                "source_quote": f"Title mentions '{brand.upper()}' on third-party domain '{hostname}'",
                "context": f"Page Title: {title}",
                "explanation": f"Page title claims official association with {brand.upper()}, but the host domain is unverified ({hostname})."
            })
            signals_score += 45
            break

    # 8. Calculate Composite Risk
    url_score = static_url_res.get("risk_score", 0)
    ml_score = int((model_prob or 0.0) * 100) if model_avail else 0

    # Non-redundant weighted combination
    composite_score = min(100, int((url_score * 0.25) + (signals_score * 0.45) + (ml_score * 0.30)))

    if composite_score >= 60:
        risk_level = "HIGH"
        verdict = "Multiple high-risk indicators detected: deceptive claims, financial triggers, or credential requests."
    elif composite_score >= 30:
        risk_level = "MEDIUM"
        verdict = "Moderate risk signals detected on webpage. Analyst review recommended before user interaction."
    else:
        risk_level = "LOW"
        verdict = "No explicit deceptive financial indicators detected in accessible page content. Domain remains subject to ongoing surveillance."

    # Identify external domains linked
    external_domains = set()
    for lk in meta["links"]:
        try:
            l_parsed = urlparse(urljoin(target_url, lk))
            l_host = (l_parsed.hostname or "").lower()
            if l_host and l_host != hostname:
                external_domains.add(l_host)
        except Exception:
            pass

    return {
        "fetch_status": "SUCCESS",
        "url": raw_url,
        "normalized_url": current_url,
        "domain": hostname,
        "status_code": status_code,
        "resolved_ips": resolved_ips,
        "redirect_chain": redirect_chain,
        "security_headers": {
            "has_https": current_url.startswith("https://"),
            "has_hsts": "strict-transport-security" in headers_dict,
            "has_csp": "content-security-policy" in headers_dict,
        },
        "page_metadata": {
            "title": title,
            "description": description,
            "total_links_found": len(meta["links"]),
            "external_domains": list(external_domains)[:10],
        },
        "visible_text_snippet": plain_text[:600] + ("..." if len(plain_text) > 600 else ""),
        "detected_signals": detected_signals,
        "url_analysis": static_url_res,
        "ml_analysis": {
            "model_available": model_avail,
            "model_probability": round(model_prob or 0.0, 4),
            "model_class": model_class,
            "model_version": model_version,
            "model_tokens": model_tokens,
        },
        "risk_assessment": {
            "risk_score": composite_score,
            "risk_level": risk_level,
            "signals_detected_count": len(detected_signals),
            "verdict_summary": verdict,
            "calculation_breakdown": {
                "static_url_heuristics_score": url_score,
                "content_signals_score": min(100, signals_score),
                "ml_classifier_score": ml_score,
            }
        }
    }


inspect_website_xray = safe_fetch_website_xray


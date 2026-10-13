import re
from urllib.parse import urlparse
from typing import List, Dict, Optional

# Regex patterns for common financial threat vectors & contact channels
PHONE_REGEX = re.compile(r'(?:\+?(\d{1,3})[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
INDIAN_PHONE_REGEX = re.compile(r'(?:\+91[-.\s]?)?[6-9]\d{9}\b')
TELEGRAM_REGEX = re.compile(r'(?:@([A-Za-z0-9_]{4,32})|t\.me/([A-Za-z0-9_]{4,32}))', re.IGNORECASE)
WHATSAPP_REGEX = re.compile(r'(?:whatsapp|wa\.me)[\s/:+]+([0-9\-\s\(\)]{8,20})', re.IGNORECASE)
UPI_REGEX = re.compile(r'\b([a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|apl|upi|axl|ibl|barodampay|federal|kotak|sbi|postbank|jupiteraxis|fam|slice|airtel|fbl|icici|hdfcbank|fakeupi))\b', re.IGNORECASE)
GENERIC_UPI_REGEX = re.compile(r'(?:upi(?:\s*id)?[:\s]+)([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32})\b', re.IGNORECASE)
URL_REGEX = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+', re.IGNORECASE)
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
CRYPTO_REGEX = re.compile(r'\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})\b')

# Known generic platform domains that should NOT be treated as single shared entity hubs
GENERIC_PLATFORM_DOMAINS = {
    "t.me", "telegram.me", "wa.me", "api.whatsapp.com",
    "instagram.com", "facebook.com", "fb.com", "twitter.com",
    "x.com", "youtube.com", "youtu.be", "google.com",
    "bit.ly", "tinyurl.com", "linktr.ee"
}

GENERIC_TELEGRAM_HANDLES = {
    "telegram", "admin", "channel", "joinchat", "support",
    "group", "contact", "official", "help", "bot"
}

REPETITIVE_PHONE_PATTERNS = {
    "0000000000", "1111111111", "2222222222", "3333333333",
    "4444444444", "5555555555", "6666666666", "7777777777",
    "8888888888", "9999999999", "1234567890", "9876543210"
}

DUMMY_UPI_HANDLES = {
    "test@upi", "example@upi", "xyz@upi", "user@upi", "demo@upi"
}


def sanitize_phone_number(raw_val: str) -> Optional[str]:
    """
    Normalizes a phone string. Rejects masked strings ('XXXX'),
    repetitive placeholders, and numbers that do not form a valid 10-digit number.
    """
    if "X" in raw_val or "x" in raw_val:
        return None

    cleaned = re.sub(r'[^\d]', '', raw_val)
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    if len(cleaned) != 10:
        return None
    if cleaned[0] not in "6789":
        return None
    if cleaned in REPETITIVE_PHONE_PATTERNS:
        return None

    return cleaned


def extract_entities(text: str, submitted_url: str = None) -> List[Dict[str, str]]:
    """
    Extracts structured entities such as phone numbers, UPI identifiers, Telegram handles,
    WhatsApp contacts, email addresses, URL domains, and crypto addresses.
    Rejects placeholders, masked values, and known generic aggregator domains.
    Returns a deduplicated list of entity dictionaries.
    """
    entities: List[Dict[str, str]] = []
    seen = set()

    def add_entity(etype: str, val: str, norm: str):
        key = (etype, norm)
        if key not in seen and norm:
            seen.add(key)
            entities.append({
                "entity_type": etype,
                "entity_value": val.strip(),
                "normalized_value": norm.strip().lower()
            })

    # 1. UPI Identifiers
    for match in UPI_REGEX.finditer(text):
        val = match.group(1).strip()
        norm = val.lower()
        if norm not in DUMMY_UPI_HANDLES and len(norm.split("@")[0]) >= 3:
            add_entity("UPI_ID", val, norm)

    for match in GENERIC_UPI_REGEX.finditer(text):
        val = match.group(1).strip()
        norm = val.lower()
        if norm not in DUMMY_UPI_HANDLES and len(norm.split("@")[0]) >= 3:
            add_entity("UPI_ID", val, norm)

    # 2. Telegram handles
    for match in TELEGRAM_REGEX.finditer(text):
        handle = match.group(1) or match.group(2)
        if handle:
            cleaned = handle.lstrip("@").lower().strip()
            if cleaned not in GENERIC_TELEGRAM_HANDLES and len(cleaned) >= 3:
                add_entity("TELEGRAM", f"@{cleaned}", cleaned)

    # 3. WhatsApp numbers
    for match in WHATSAPP_REGEX.finditer(text):
        val = match.group(1)
        cleaned = sanitize_phone_number(val)
        if cleaned:
            add_entity("WHATSAPP", f"+91 {cleaned}", cleaned)

    # 4. Indian phone numbers (10 digits starting with 6-9)
    for match in INDIAN_PHONE_REGEX.finditer(text):
        val = match.group(0)
        cleaned = sanitize_phone_number(val)
        if cleaned:
            add_entity("PHONE", f"+91 {cleaned}", cleaned)

    # 5. Standard phone numbers
    for match in PHONE_REGEX.finditer(text):
        val = match.group(0)
        cleaned = sanitize_phone_number(val)
        if cleaned:
            add_entity("PHONE", f"+91 {cleaned}", cleaned)

    # 6. Emails
    for match in EMAIL_REGEX.finditer(text):
        val = match.group(0)
        norm = val.lower().strip()
        if not norm.endswith("@example.com") and not norm.endswith("@test.com"):
            add_entity("EMAIL", val, norm)

    # 7. Crypto addresses
    for match in CRYPTO_REGEX.finditer(text):
        val = match.group(0)
        add_entity("CRYPTO", val, val.lower().strip())

    # 8. URLs & Specific Landing Pages
    found_urls = URL_REGEX.findall(text)
    if submitted_url:
        found_urls.append(submitted_url)

    for raw_url in found_urls:
        try:
            parsed = urlparse(raw_url if "://" in raw_url else f"http://{raw_url}")
            domain = parsed.netloc.lower().strip()
            if domain.startswith("www."):
                domain = domain[4:]

            # If it's a generic messaging platform, do not treat the bare domain as a shared entity!
            if domain in GENERIC_PLATFORM_DOMAINS:
                path_part = parsed.path.strip("/").lower()
                # If Telegram link has username, extract Telegram entity
                if domain in ["t.me", "telegram.me"] and path_part and path_part not in GENERIC_TELEGRAM_HANDLES:
                    add_entity("TELEGRAM", f"@{path_part}", path_part)
                elif domain in ["wa.me", "api.whatsapp.com"] and path_part:
                    ph = sanitize_phone_number(path_part)
                    if ph:
                        add_entity("WHATSAPP", f"+91 {ph}", ph)
                continue

            if domain and "." in domain and len(domain) >= 4:
                # Store full normalized landing URL if specific path exists, otherwise clean domain
                clean_path = parsed.path.rstrip("/")
                if clean_path and clean_path != "/":
                    norm_url = f"{domain}{clean_path}".lower()
                    add_entity("URL", raw_url.strip(), norm_url)
                else:
                    add_entity("URL_DOMAIN", raw_url.strip(), domain)
        except Exception:
            continue

    return entities

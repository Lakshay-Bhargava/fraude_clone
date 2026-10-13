import re
from urllib.parse import urlparse
from typing import List, Dict

# Regex patterns for common financial threat vectors & contact channels
PHONE_REGEX = re.compile(r'(?:\+?(\d{1,3})[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
TELEGRAM_REGEX = re.compile(r'(?:@([A-Za-z0-9_]{4,32})|t\.me/([A-Za-z0-9_]{4,32}))', re.IGNORECASE)
WHATSAPP_REGEX = re.compile(r'(?:whatsapp|wa\.me)[\s/:+]+([0-9\-\s\(\)]{8,20})', re.IGNORECASE)
URL_REGEX = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+', re.IGNORECASE)
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
CRYPTO_REGEX = re.compile(r'\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})\b')

def extract_entities(text: str, submitted_url: str = None) -> List[Dict[str, str]]:
    """
    Extracts structured entities such as phone numbers, Telegram handles,
    WhatsApp contacts, email addresses, URL domains, and crypto addresses.
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

    # Telegram handles
    for match in TELEGRAM_REGEX.finditer(text):
        handle = match.group(1) or match.group(2)
        if handle:
            cleaned = handle.lstrip("@").lower()
            add_entity("TELEGRAM", f"@{cleaned}", cleaned)

    # WhatsApp numbers
    for match in WHATSAPP_REGEX.finditer(text):
        val = match.group(1)
        cleaned = re.sub(r'[^\d+]', '', val)
        if len(cleaned) >= 7:
            add_entity("WHATSAPP", val.strip(), cleaned)

    # Phone numbers
    for match in PHONE_REGEX.finditer(text):
        val = match.group(0)
        cleaned = re.sub(r'[^\d+]', '', val)
        if len(cleaned) >= 7:
            add_entity("PHONE", val.strip(), cleaned)

    # Emails
    for match in EMAIL_REGEX.finditer(text):
        val = match.group(0)
        add_entity("EMAIL", val, val.lower())

    # Crypto addresses
    for match in CRYPTO_REGEX.finditer(text):
        val = match.group(0)
        add_entity("CRYPTO", val, val.lower())

    # URLs & Domain extraction from text
    found_urls = URL_REGEX.findall(text)
    if submitted_url:
        found_urls.append(submitted_url)

    for raw_url in found_urls:
        try:
            parsed = urlparse(raw_url if "://" in raw_url else f"http://{raw_url}")
            domain = parsed.netloc.lower()
            if domain:
                add_entity("URL_DOMAIN", raw_url.strip(), domain)
        except Exception:
            continue

    return entities

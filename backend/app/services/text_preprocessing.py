import re
import hashlib
import unicodedata
from typing import Tuple

def normalize_text(text: str) -> str:
    """
    Normalizes whitespace and Unicode characters while preserving the original content structure.
    Also strips hidden zero-width spaces and control characters.
    """
    if not text:
        return ""
    
    # Normalize unicode to NFKC
    normalized = unicodedata.normalize("NFKC", text)
    
    # Strip zero-width spaces and hidden unicode control markers
    normalized = re.sub(r'[\u200B-\u200D\uFEFF]', '', normalized)
    
    # Replace multiple whitespaces and newlines with a single space
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized

def calculate_content_hash(normalized_text: str) -> str:
    """
    Generates a deterministic SHA-256 hash of the normalized advertisement text.
    Used for instant exact-duplicate detection.
    """
    return hashlib.sha256(normalized_text.lower().encode("utf-8")).hexdigest()

def clean_url_string(url: str) -> str:
    """
    Cleans and standardizes a submitted URL string without making any external network requests.
    """
    if not url:
        return ""
    url = url.strip()
    if not re.match(r'^https?://', url, re.IGNORECASE):
        url = "https://" + url
    return url

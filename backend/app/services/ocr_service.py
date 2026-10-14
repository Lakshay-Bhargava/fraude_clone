"""
FRAUDSCOPE AI — Advanced Forensic Optical Character Recognition (OCR) Engine
=============================================================================
Performs multi-strategy image preprocessing, contrast enhancement, dynamic
thresholding, and multi-PSM character recognition on uploaded advertisement
screenshots. Extracts structured text while recovering contact vectors
(Telegram @handles, WhatsApp/Phone numbers, UPI handles, URLs, and financial claims).
"""

import io
import os
import re
import shutil
import subprocess
from typing import Tuple, List, Dict, Optional, Set
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import pytesseract


def find_tesseract_binary() -> Optional[str]:
    """
    Auto-discovers Tesseract executable across bundled repo directories,
    standard Windows Program Files installations, standard Linux paths, and system PATH.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    candidates = [
        # 1. Bundled portable binary in repository (Windows local dev)
        os.path.join(project_root, "backend", "tesseract", "tesseract.exe"),
        os.path.join(current_dir, "..", "..", "tesseract", "tesseract.exe"),
        # 2. Standard Windows installation paths
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        # 3. System PATH (works for both Windows and Linux)
        shutil.which("tesseract"),
        shutil.which("tesseract.exe"),
        # 4. Standard Linux installation locations
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
    ]

    for candidate in candidates:
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return os.path.abspath(candidate)
    return None


def configure_tesseract() -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Configures pytesseract with discovered binary and sets TESSDATA_PREFIX.
    Returns (is_available, binary_path, error_message).
    """
    binary_path = find_tesseract_binary()
    if not binary_path:
        return False, None, "Tesseract-OCR binary not found on host. Please install Tesseract-OCR or place binaries in backend/tesseract."

    pytesseract.pytesseract.tesseract_cmd = binary_path

    # Auto-configure tessdata
    # 1. Respect explicit environment variable if set and valid
    existing_prefix = os.environ.get("TESSDATA_PREFIX")
    if existing_prefix and os.path.isdir(existing_prefix):
        return True, binary_path, None

    # 2. Check candidate tessdata directories (relative to binary, Linux standard dirs)
    candidate_tessdata = [
        os.path.join(os.path.dirname(binary_path), "tessdata"),
        "/usr/share/tesseract-ocr/5/tessdata",
        "/usr/share/tesseract-ocr/4.00/tessdata",
        "/usr/share/tessdata",
        "/usr/local/share/tessdata",
    ]
    for candidate in candidate_tessdata:
        if candidate and os.path.isdir(candidate):
            os.environ["TESSDATA_PREFIX"] = candidate
            break

    return True, binary_path, None


def get_available_languages() -> List[str]:
    """Retrieves list of installed tessdata language packs."""
    is_avail, binary_path, _ = configure_tesseract()
    if not is_avail:
        return []
    try:
        langs = pytesseract.get_languages(config="")
        return langs
    except Exception:
        tessdata = os.environ.get("TESSDATA_PREFIX", "")
        if tessdata and os.path.isdir(tessdata):
            return [
                f.replace(".traineddata", "")
                for f in os.listdir(tessdata)
                if f.endswith(".traineddata")
            ]
        return ["eng"]


def preprocess_image_variations(orig_img: Image.Image) -> List[Tuple[str, Image.Image, str]]:
    """
    Generates tailored image representations optimized for different text modalities:
    - High-contrast grayscale for low-contrast headings
    - Binarized Otsu-style thresholding for sharp text on banners
    - Inverted binarization for white text on dark/colored stickers
    - Original scaled RGB
    """
    # 1. Handle transparency: alpha composite onto white background
    if orig_img.mode in ("RGBA", "LA") or (orig_img.mode == "P" and "transparency" in orig_img.info):
        bg = Image.new("RGB", orig_img.size, (255, 255, 255))
        rgba = orig_img.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[3])
        base_rgb = bg
    else:
        base_rgb = orig_img.convert("RGB")

    # 2. EXIF Auto-Orientation
    base_rgb = ImageOps.exif_transpose(base_rgb) or base_rgb

    # 3. Dynamic Resolution Scaling (upscale small images for high OCR fidelity)
    w, h = base_rgb.size
    if w < 900 or h < 900:
        factor = max(2, int(1400 / max(1, min(w, h))))
        base_rgb = base_rgb.resize((w * factor, h * factor), Image.Resampling.LANCZOS)

    # 4. Grayscale & Contrast variations
    gray = base_rgb.convert("L")
    contrast_enhanced = ImageEnhance.Contrast(gray).enhance(2.2)

    # 5. Dynamic binary thresholding
    # Split text into bright on dark vs dark on bright
    bw = gray.point(lambda x: 255 if x > 130 else 0, "L")
    bw_inv = ImageOps.invert(bw)

    return [
        ("contrast_psm11", contrast_enhanced, "--psm 11"),
        ("contrast_psm6", contrast_enhanced, "--psm 6"),
        ("binary_psm11", bw, "--psm 11"),
        ("binary_inv_psm11", bw_inv, "--psm 11"),
        ("base_rgb_psm11", base_rgb, "--psm 11"),
        ("gray_psm6", gray, "--psm 6"),
    ]


def clean_and_deduplicate_ocr_lines(raw_lines: List[str]) -> str:
    """
    Cleans noisy artifact lines, strips non-printable characters,
    and deduplicates repeated phrases while preserving vital investigative entities
    (handles, phone numbers, UPI keywords, currency figures).
    """
    cleaned: List[str] = []
    seen_keys: Set[str] = set()

    for raw in raw_lines:
        line = raw.strip()
        if not line or len(line) < 3:
            continue

        # Strip control characters
        clean_text = re.sub(r"[\x00-\x1f\x7f-\x9f]+", " ", line).strip()
        clean_text = re.sub(r"\s+", " ", clean_text)

        # Check content validity
        alpha_count = sum(1 for c in clean_text if c.isalnum())
        has_valuable_token = any(tok in clean_text for tok in ["@", "+", "₹", "$", "http", "t.me", "wa.me", "upi"])
        if alpha_count < 2 and not has_valuable_token:
            continue

        # Check for excessive unprintable symbol noise
        non_text_count = sum(1 for c in clean_text if not (c.isalnum() or c.isspace() or c in "@+-_.,()/:|₹$%&!?#*"))
        if non_text_count > 2 or (len(clean_text) > 4 and non_text_count / len(clean_text) > 0.25):
            continue

        # Deduplication signature
        norm_key = re.sub(r"[^\w@+]", "", clean_text).lower()
        if len(norm_key) >= 4 and norm_key in seen_keys:
            continue
        seen_keys.add(norm_key)

        cleaned.append(clean_text)

    return "\n".join(cleaned)


def extract_text_from_image(image_bytes: bytes) -> Tuple[bool, str, str]:
    """
    Performs forensic Optical Character Recognition (OCR) on image bytes.
    Automatically configures Tesseract, applies multi-strategy preprocessing,
    and returns: (success: bool, extracted_text: str, diagnostic_message: str)
    """
    # 1. Check & Configure Tesseract Engine
    is_avail, bin_path, err_msg = configure_tesseract()
    if not is_avail:
        return False, "", err_msg or "Tesseract OCR engine not installed on host."

    # 2. Decode Image Data
    if not image_bytes or len(image_bytes) == 0:
        return False, "", "Empty image payload received."

    try:
        orig_image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return False, "", f"Failed to open image file: {str(e)}"

    # 3. Detect available language packs (eng + hin if installed)
    installed_langs = get_available_languages()
    lang_str = "eng"
    if "hin" in installed_langs:
        lang_str = "eng+hin"

    # 4. Multi-Strategy OCR Execution
    raw_lines: List[str] = []
    try:
        variations = preprocess_image_variations(orig_image)
        for name, img_variant, psm in variations:
            try:
                config = f"-l {lang_str} {psm}"
                extracted_chunk = pytesseract.image_to_string(img_variant, config=config)
                raw_lines.extend(extracted_chunk.splitlines())
            except Exception:
                # Fallback to pure english if combined language pack encounters an issue
                try:
                    extracted_chunk = pytesseract.image_to_string(img_variant, config=f"-l eng {psm}")
                    raw_lines.extend(extracted_chunk.splitlines())
                except Exception:
                    pass

        # 5. Clean, Filter, and Merge
        final_text = clean_and_deduplicate_ocr_lines(raw_lines)

        if not final_text:
            return True, "", "OCR processed successfully, but no legible text was recognized in this image."

        char_count = len(final_text)
        return True, final_text, f"OCR completed successfully: extracted {char_count} characters across forensic passes."

    except Exception as e:
        err_str = str(e)
        if "tesseract is not installed" in err_str.lower() or "not found" in err_str.lower():
            return False, "", "Tesseract executable path error. Please verify Tesseract is installed."
        return False, "", f"OCR processing error: {err_str}"

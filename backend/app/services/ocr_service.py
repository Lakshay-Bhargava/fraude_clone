import io
from typing import Tuple
from PIL import Image

def extract_text_from_image(image_bytes: bytes) -> Tuple[bool, str, str]:
    """
    Attempts to perform Optical Character Recognition (OCR) on image bytes using pytesseract.
    Returns: (success: bool, extracted_text: str, message: str)
    Gracefully handles missing Tesseract binaries or corrupt files.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        # Ensure image is in RGB mode for processing
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception as e:
        return False, "", f"Failed to open image: {str(e)}"

    try:
        import pytesseract
        extracted = pytesseract.image_to_string(image)
        extracted = extracted.strip()
        if not extracted:
            return True, "", "OCR processed successfully, but no readable text was detected in the image."
        return True, extracted, "Text successfully extracted from image."
    except Exception as e:
        err_msg = str(e)
        if "tesseract is not installed" in err_msg.lower() or "not found" in err_msg.lower():
            return False, "", "Tesseract-OCR executable was not found on the host system. Please install Tesseract or paste the advertisement text directly into the scanner."
        return False, "", f"OCR extraction error: {err_msg}"

from fastapi import APIRouter, HTTPException

from app.services.extract import bs4_extract_text

router = APIRouter()


@router.get("/extract")
def extract(url: str, preview: int = 300, min_chars: int = 0):
    """
    Fetch a page and return plain text (minimal extractor).
    - preview: number of chars in preview field
    - min_chars: if >0 and extracted text is shorter, 'text' is omitted
    """
    try:
        final_url, text = bs4_extract_text(url)
        return {
            "ok": True,
            "source_url": final_url,
            "chars": len(text),
            "preview": text[:preview],
            "text": text if (min_chars == 0 or len(text) >= min_chars) else None,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Fetch/extract failed: {e}")

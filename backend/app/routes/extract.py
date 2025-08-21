from fastapi import APIRouter, HTTPException, Query
from app.services.extract import extract_article_text

router = APIRouter()


@router.get("/extract")
def extract(url: str = Query(..., description="Article URL")):
    try:
        text = extract_article_text(url)
        if not text:
            raise HTTPException(status_code=404, detail="No text extracted")
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

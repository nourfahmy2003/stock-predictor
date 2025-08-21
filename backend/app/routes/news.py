from datetime import datetime
import yfinance as yf
from dateutil.parser import parse as parse_date
from fastapi import APIRouter, HTTPException, Query
from app.utils.google_news import (
    discover_links,
    _unwrap_google_news,
    _resolve_google_news_article,
    _normalize_amp,
)
from app.utils.text import _clean_title
from app.services.extract import extract_article_text
from app.services.sentiment import classify_texts

router = APIRouter()

RANGE_TO_DAYS = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "9m": 270, "1y": 365}
PREVIEW_LEN = 200


@router.get("/news/{ticker}")
def news(
    ticker: str,
    range: str = Query("1w", pattern="^(1w|1m|3m|6m|9m|1y)$"),
    analyze: bool = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    try:
        days = RANGE_TO_DAYS.get(range, 7)
        name = None
        try:
            info = (yf.Ticker(ticker.upper()).get_info() or yf.Ticker(ticker.upper()).info)
            name = info.get("shortName") or info.get("longName")
        except Exception:
            pass
        query = f"{name or ticker} OR {ticker} stock"
        items = discover_links(query, days)
        deduped = []
        seen = set()
        for it in items:
            link = _unwrap_google_news(it.get("link", ""))
            link = _resolve_google_news_article(link)
            link = _normalize_amp(link)
            if link in seen:
                continue
            seen.add(link)
            it["link"] = link
            deduped.append(it)
        items = deduped

        def _parse_pub(pub):
            try:
                if isinstance(pub, str):
                    return parse_date(pub)
                return pub or datetime.min
            except Exception:
                return datetime.min

        items.sort(key=lambda x: _parse_pub(x.get("published")), reverse=True)
        total = len(items)
        start = (page - 1) * per_page
        paginated = items[start : start + per_page]
        filtered = []
        bodies: list[str] = []
        titles: list[str] = []
        for it in paginated:
            body = extract_article_text(it["link"])
            if not body:
                continue
            if analyze:
                it.update(
                    {
                        "analyzedFrom": "body",
                        "analyzedTextPreview": body[:PREVIEW_LEN],
                        "analyzedTextLength": len(body),
                    }
                )
                bodies.append(body)
                titles.append(_clean_title(it.get("title", "")))
            filtered.append(it)
        if analyze and bodies:
            body_sentiments = classify_texts(bodies)
            title_sentiments = classify_texts(titles)
            for it, bs, ts in zip(filtered, body_sentiments, title_sentiments):
                it.update(
                    {
                        "sentiment": bs["sentiment"],
                        "confidence": bs["confidence"],
                        "stars": bs["stars"],
                        "headlineSentiment": ts["sentiment"],
                        "headlineConfidence": ts["confidence"],
                        "headlineStars": ts["stars"],
                    }
                )
        return {
            "ticker": ticker.upper(),
            "range": range,
            "page": page,
            "per_page": per_page,
            "total": total,
            "count": len(filtered),
            "items": filtered,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

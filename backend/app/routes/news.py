import time
import feedparser
import yfinance as yf
from urllib.parse import quote_plus
from fastapi import APIRouter, HTTPException, Query
from app.utils.google_news import (
    _unwrap_google_news,
    _resolve_google_news_article,
    _normalize_amp,
)
from app.services.extract import extract_article_text
from app.services.sentiment import classify_texts

router = APIRouter()

RANGE_TO_DAYS = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "9m": 270, "1y": 365}


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
        url = (
            "https://news.google.com/rss/search?"
            f"q={quote_plus(query + ' when:' + str(days) + 'd')}"
            "&hl=en-US&gl=US&ceid=US:en&num=200"
        )
        feed = feedparser.parse(url)
        if feed.bozo:
            raise HTTPException(status_code=503, detail="Failed to parse feed")
        items = []
        for entry in feed.entries:
            link = _unwrap_google_news(entry.get("link", ""))
            link = _resolve_google_news_article(link)
            link = _normalize_amp(link)
            src = getattr(entry, "source", None)
            source_name = getattr(src, "title", None) if src else None
            published = (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", entry.published_parsed)
                if getattr(entry, "published_parsed", None)
                else None
            )
            items.append(
                {
                    "title": entry.get("title", ""),
                    "link": link,
                    "source": source_name,
                    "published": published,
                }
            )
        items.sort(key=lambda x: x.get("published") or "", reverse=True)
        total = len(items)
        start = (page - 1) * per_page
        paginated = items[start : start + per_page]
        if analyze and paginated:
            texts = [extract_article_text(it["link"]) for it in paginated]
            sentiments = classify_texts(texts)
            for it, s in zip(paginated, sentiments):
                it.update(
                    {
                        "sentiment": s["sentiment"],
                        "confidence": s["confidence"],
                        "stars": s["stars"],
                    }
                )
        return {
            "ticker": ticker.upper(),
            "range": range,
            "page": page,
            "per_page": per_page,
            "total": total,
            "count": len(paginated),
            "items": paginated,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

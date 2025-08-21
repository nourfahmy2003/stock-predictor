import asyncio
import time
from urllib.parse import quote_plus

import feedparser
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from app.services.extract import bs4_extract_text
from app.services.sentiment import classify_texts, _CLASSIFY_SEM, MODEL_ID
from app.utils.text import _clean_title, _preview, _summarize_first_n_sentences

router = APIRouter()

RANGE_TO_DAYS = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "9m": 270, "1y": 365}


def _aggregate_summary(items):
    total = len(items)
    pos = sum(1 for x in items if x.get("sentiment") == "positive")
    neg = sum(1 for x in items if x.get("sentiment") == "negative")
    neu = total - pos - neg
    avg_stars = round(sum(x.get("stars", 3) for x in items) / total, 2) if total else None
    return {"total": total, "positive": pos, "neutral": neu, "negative": neg, "avg_stars": avg_stars}


@router.get("/news/{ticker}")
async def news(
    ticker: str,
    range: str = Query("1w", pattern="^(1w|1m|3m|6m|9m|1y)$"),
    analyze: bool = True,
    analyze_scope: str = Query("headline", pattern="^(headline|summary|full)$"),
    include_text: bool = False,
    summary_sentences: int = Query(4, ge=1, le=12),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    max_chars: int = Query(2400, ge=300, le=20000),
    min_extract_chars: int = Query(300, ge=0, le=20000),
    debug: bool = False,
):
    """
    analyze_scope:
      - headline: analyze cleaned title (fastest)
      - summary: use minimal extractor, keep first N sentences
      - full: use minimal extractor, analyze full text (truncated to max_chars)
    """
    try:
        days = RANGE_TO_DAYS.get(range, 7)

        name = None
        try:
            info = (yf.Ticker(ticker.upper()).get_info() or yf.Ticker(ticker.upper()).info)
            name = info.get("shortName") or info.get("longName")
        except Exception:
            pass

        q = f"{name or ticker} OR {ticker} stock"
        url = (
            "https://news.google.com/rss/search?"
            f"q={quote_plus(q + ' when:' + str(days) + 'd')}"
            "&hl=en-US&gl=US&ceid=US:en&num=200"
        )

        feed = feedparser.parse(url)
        if getattr(feed, "bozo", False):
            raise HTTPException(status_code=503, detail="Failed to parse feed")

        items = []
        for entry in feed.entries:
            link = entry.get("link", "") or ""

            source_name = None
            try:
                src = entry.get("source")
                if isinstance(src, dict):
                    source_name = src.get("title") or src.get("href")
                else:
                    source_name = getattr(src, "title", None) or getattr(src, "href", None)
            except Exception:
                pass

            published = (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", entry.published_parsed)
                if getattr(entry, "published_parsed", None)
                else None
            )

            items.append(
                {
                    "title": entry.get("title", "") or "",
                    "link": link,
                    "source": source_name,
                    "published": published,
                }
            )

        items.sort(key=lambda x: x.get("published") or "", reverse=True)

        total = len(items)
        start = (page - 1) * per_page
        paginated = items[start : start + per_page]

        extracted_payloads = [None] * len(paginated)
        texts_for_analysis: list[str] = []
        analysis_meta: list[dict] = []

        if analyze and paginated:
            if analyze_scope == "headline":
                for it in paginated:
                    txt = _clean_title(it["title"])
                    texts_for_analysis.append(txt)
                    analysis_meta.append(
                        {
                            "len": len(txt),
                            "preview": _preview(txt),
                            "source": "headline",
                            "method": "headline",
                            "extracted_len": 0,
                            "used_headline_fallback": True,
                        }
                    )
            else:
                async def _extract(it):
                    final_url, text = await asyncio.to_thread(bs4_extract_text, it["link"])
                    used_headline_fallback = False
                    analyzed_text = (text or "").strip()
                    if len(analyzed_text) < min_extract_chars:
                        analyzed_text = _clean_title(it["title"])
                        used_headline_fallback = True
                    payload = {
                        "source_url": final_url,
                        "method": "bs4",
                        "extracted_len": len(text or ""),
                    }
                    return analyzed_text, payload, used_headline_fallback, text

                results = await asyncio.gather(*[_extract(it) for it in paginated])

                for idx, (analyzed_text, payload, used_headline_fallback, raw_text) in enumerate(results):
                    if analyze_scope == "summary":
                        s = _summarize_first_n_sentences(analyzed_text, summary_sentences, max_chars)
                        texts_for_analysis.append(s if s else _clean_title(paginated[idx]["title"]))
                        extracted_payloads[idx] = {"summary": s, "source_url": payload["source_url"]}
                        analysis_meta.append(
                            {
                                "len": len(s or ""),
                                "preview": _preview(s or ""),
                                "source": "summary",
                                "method": payload["method"],
                                "extracted_len": payload["extracted_len"],
                                "used_headline_fallback": used_headline_fallback,
                            }
                        )
                    else:
                        full = analyzed_text
                        if len(full) > max_chars:
                            full = full[:max_chars].rsplit(" ", 1)[0] + "…"
                        texts_for_analysis.append(full)
                        extracted_payloads[idx] = {"text": full, "source_url": payload["source_url"]}
                        analysis_meta.append(
                            {
                                "len": len(full),
                                "preview": _preview(full),
                                "source": "full",
                                "method": payload["method"],
                                "extracted_len": payload["extracted_len"],
                                "used_headline_fallback": used_headline_fallback,
                            }
                        )

            async with _CLASSIFY_SEM:
                sentiments = await asyncio.to_thread(classify_texts, texts_for_analysis)

            merged = []
            for it, s, extra, meta in zip(paginated, sentiments, extracted_payloads, analysis_meta):
                row = {
                    **it,
                    "engine": MODEL_ID.split("/")[-1],
                    "sentiment": s["sentiment"],
                    "stars": s["stars"],
                    "confidence": s["confidence"],
                    "raw_label": s["raw_label"],
                    "analyzed_on": analyze_scope,
                }
                if include_text and extra:
                    row.update(extra)
                if debug:
                    row["_analyzed_len"] = meta["len"]
                    row["_analyzed_preview"] = meta["preview"]
                    row["_analyzed_source"] = meta["source"]
                    row["_extraction_method"] = meta["method"]
                    row["_extracted_len"] = meta["extracted_len"]
                    row["_used_headline_fallback"] = meta["used_headline_fallback"]
                merged.append(row)
            paginated = merged

        agg = None
        if analyze and paginated and isinstance(paginated[0], dict) and "sentiment" in paginated[0]:
            agg = _aggregate_summary(paginated)

        return {
            "ticker": ticker.upper(),
            "range": range,
            "page": page,
            "per_page": per_page,
            "total": total,
            "count": len(paginated),
            "aggregate": agg,
            "items": paginated,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

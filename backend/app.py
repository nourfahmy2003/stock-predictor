# app.py
import os, json, tempfile, asyncio, uuid, time, logging, threading, re
from urllib.parse import quote_plus, urlparse, parse_qs

import papermill as pm
import feedparser
import yfinance as yf
import requests
from bs4 import BeautifulSoup

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ---- Sentiment model: distilroberta fine-tuned for financial news ----
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# =========================
# Logging & ENV
# =========================
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("stock-predictor")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

UA_HDRS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}
HTTP_TIMEOUT = 20

def _preview(txt: str, n: int = 180) -> str:
    return re.sub(r"\s+", " ", (txt or "")[:n]).strip()

def _clean_title(s: str) -> str:
    return (s or "").split(" - ")[0].strip()

def _unwrap_google_news(url: str) -> str:
    """
    Return publisher URL from Google News links:
    - If ?url= exists, use that.
    - If /articles/ link, follow once and take the redirect target.
    """
    try:
        qs = parse_qs(urlparse(url).query)
        if "url" in qs and qs["url"]:
            return qs["url"][0]
        if "news.google.com" in url and "/articles/" in url:
            r = requests.get(url, headers=UA_HDRS, timeout=HTTP_TIMEOUT, allow_redirects=True)
            if r is not None and r.url and "news.google.com" not in r.url:
                return r.url
    except Exception:
        pass
    return url

def bs4_extract_text(potential_gn_url: str) -> tuple[str, str]:
    """
    EXACT same minimal extraction for /extract and /news:
    - unwrap Google News link to publisher
    - GET with desktop UA
    - BeautifulSoup(get_text)
    Returns (final_url, plain_text)
    """
    pub_url = _unwrap_google_news(potential_gn_url)
    r = requests.get(pub_url, headers=UA_HDRS, timeout=HTTP_TIMEOUT, allow_redirects=True)
    final_url = r.url or pub_url

    # lxml if available; fallback to html.parser
    try:
        soup = BeautifulSoup(r.text, "lxml")
    except Exception:
        soup = BeautifulSoup(r.text, "html.parser")

    # strip non-content tags
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True) or ""
    return final_url, text

# =========================
# Sentiment (ACTIVE)
# =========================
MODEL_ID = "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis"
_LOAD_LOCK = threading.Lock()
_CLASSIFY_SEM = asyncio.Semaphore(1)
_tok = None
_mdl = None

def _get_sentiment_components():
    global _tok, _mdl
    if _tok is None or _mdl is None:
        with _LOAD_LOCK:
            if _tok is None or _mdl is None:
                logger.info("Loading sentiment model: %s", MODEL_ID)
                _tok = AutoTokenizer.from_pretrained(MODEL_ID)
                _mdl = AutoModelForSequenceClassification.from_pretrained(
                    MODEL_ID, torch_dtype=torch.float32
                )
                _mdl.to("cpu").eval()
    return _tok, _mdl

def _norm_label_binary(label: str, score: float, neutral_band: float = 0.55):
    L = (label or "").lower()
    if score < neutral_band:
        return "neutral", 3
    if L in ("label_1", "positive", "pos"):
        return "positive", 5
    if L in ("label_0", "negative", "neg"):
        return "negative", 1
    return "neutral", 3

def _classify_one(text: str, max_len: int = 512, stride: int = 64):
    tok, mdl = _get_sentiment_components()
    if not text:
        return {"sentiment": "neutral", "stars": 3, "confidence": 0.0, "raw_label": "neutral"}

    enc = tok(text, return_tensors="pt", truncation=False)
    input_ids = enc["input_ids"][0]
    attn = enc["attention_mask"][0]
    total_len = int(input_ids.shape[0])

    if total_len <= max_len:
        with torch.no_grad():
            out = mdl(**{k: v for k, v in enc.items()})
            logits = out.logits[0]
    else:
        windows = []
        step = max_len - stride
        for start in range(0, total_len, step):
            end = min(start + max_len, total_len)
            chunk = {
                "input_ids": input_ids[start:end].unsqueeze(0),
                "attention_mask": attn[start:end].unsqueeze(0),
            }
            with torch.no_grad():
                out = mdl(**chunk)
                windows.append(out.logits[0])
            if end == total_len:
                break
        logits = torch.stack(windows, dim=0).mean(dim=0)

    probs = torch.softmax(logits, dim=-1)
    score, idx = torch.max(probs, dim=-1)
    raw_label = _mdl.config.id2label[int(idx)]
    sentiment, stars = _norm_label_binary(raw_label, float(score))
    return {
        "sentiment": sentiment,
        "stars": stars,
        "confidence": float(score),
        "raw_label": raw_label,
    }

def classify_texts(texts):
    out = []
    for t in texts:
        r = _classify_one(t)
        out.append(r)
        logger.info(
            "NEWS SENTIMENT | %d★ (%.3f) | [%s] %s",
            r["stars"], r["confidence"], MODEL_ID.split("/")[-1], _preview(t)
        )
    return out

# =========================
# Forecast (Papermill)
# =========================
NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")

app = FastAPI(title="Stock Predictor Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("FRONTEND_ORIGIN", "https://your-frontend-domain"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _warmup():
    try:
        await asyncio.to_thread(_get_sentiment_components)
    except Exception as e:
        logger.warning("Sentiment warmup skipped: %s", e)

# In-memory job store
jobs: dict[str, dict] = {}

def run_forecast_blocking(ticker: str, look_back: int, horizon: int) -> list[dict]:
    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")

        params = {"TICKER": ticker, "LOOKBACK": look_back, "HORIZON": horizon, "OUTPUT_JSON": out_json}

        pm.execute_notebook(
            NOTEBOOK_PATH,
            out_nb,
            parameters=params,
            kernel_name="python3",
            progress=False,
        )

        if not os.path.exists(out_json):
            raise RuntimeError(
                "Notebook completed but OUTPUT_JSON not found. "
                "Make sure the notebook writes forecast_df.to_json(OUTPUT_JSON)"
            )

        with open(out_json) as f:
            return json.load(f)

class PredictIn(BaseModel):
    ticker: str
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)

class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list

async def _run_job(job_id: str, payload: PredictIn):
    try:
        jobs[job_id] = {"state": "running", "progress": 0}
        forecast = await asyncio.to_thread(
            run_forecast_blocking,
            payload.ticker.upper(),
            payload.look_back,
            payload.horizon,
        )
        jobs[job_id] = {
            "state": "done",
            "result": {
                "ticker": payload.ticker.upper(),
                "look_back": payload.look_back,
                "horizon": payload.horizon,
                "forecast": forecast,
            },
        }
    except Exception as e:
        jobs[job_id] = {"state": "error", "message": str(e)}

def create_job(payload: PredictIn) -> str:
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "queued"}
    asyncio.create_task(_run_job(job_id, payload))
    return job_id

def get_job_status(job_id: str | None):
    if job_id is None:
        return None
    return jobs.get(job_id)

# ---------- Forecast routes ----------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "notebook": NOTEBOOK_PATH,
        "sentiment_backend": "local-transformers",
        "sentiment_model": MODEL_ID,
    }

@app.post("/predict")
async def start_prediction(payload: PredictIn):
    job_id = create_job(payload)
    return JSONResponse({"jobId": job_id}, status_code=202)

@app.get("/status")
async def status(req: Request):
    qp = req.query_params
    job_id = qp.get("jobId") or qp.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="Missing jobId/job_id")
    st = get_job_status(job_id)
    if st is None:
        raise HTTPException(status_code=404, detail="Unknown jobId")
    return st

@app.get("/forecast", response_model=ForecastOut)
def forecast(
    ticker: str = Query(..., description="e.g. AAPL or BTC-USD"),
    look_back: int = Query(60, ge=10, le=365),
    horizon: int = Query(10, ge=1, le=60),
):
    try:
        f = run_forecast_blocking(ticker.upper(), look_back, horizon)
        return ForecastOut(ticker=ticker.upper(), look_back=look_back, horizon=horizon, forecast=f)
    except Exception as e:
        raise HTTPException(500, f"Notebook failed: {e}")

@app.get("/overview/{ticker}")
def overview(ticker: str):
    try:
        t = yf.Ticker(ticker.upper())
        fi = getattr(t, "fast_info", {}) or {}

        price = fi.get("last_price") or fi.get("last_close") or fi.get("regular_market_price")
        prev = fi.get("previous_close") or fi.get("last_close")
        day_low = fi.get("day_low"); day_high = fi.get("day_high")
        volume = fi.get("last_volume") or fi.get("regular_market_volume")
        market_cap = fi.get("market_cap"); currency = fi.get("currency") or "USD"
        pe_ratio = None

        if not price or price == 0:
            hist = t.history(period="2d", interval="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                if len(hist) > 1:
                    prev = float(hist["Close"].iloc[-2])

        if day_low is None or day_high is None:
            intraday = t.history(period="1d", interval="1m")
            if not intraday.empty:
                day_low = float(intraday["Low"].min())
                day_high = float(intraday["High"].max())

        try:
            info = t.info or {}
            pe_ratio = info.get("trailingPE", pe_ratio)
            market_cap = market_cap or info.get("marketCap")
        except Exception:
            pass

        change = change_pct = None
        if price is not None and prev is not None:
            change = float(price) - float(prev)
            if prev:
                change_pct = change / float(prev)

        return {
            "ticker": ticker.upper(),
            "price": float(price or 0),
            "change": change,
            "changePercent": change_pct,
            "volume": int(volume) if volume is not None else None,
            "peRatio": float(pe_ratio) if pe_ratio is not None else None,
            "marketCap": int(market_cap) if market_cap is not None else None,
            "dayRange": {
                "low": float(day_low) if day_low is not None else None,
                "high": float(day_high) if day_high is not None else None,
            },
            "currency": currency,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/chart/{ticker}")
def chart(ticker: str, range: str = Query("1y"), interval: str = Query("1d")):
    try:
        period_map = {
            "1d": "1d","5d": "5d","1mo": "1mo","3mo": "3mo","6mo": "6mo",
            "1y": "1y","2y": "2y","5y": "5y","10y": "10y","ytd": "ytd","max": "max",
        }
        period = period_map.get(range, "1y")
        df = yf.Ticker(ticker.upper()).history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail="No chart data")
        out = [
            {
                "date": i.isoformat(),
                "open": float(r["Open"]), "high": float(r["High"]),
                "low": float(r["Low"]),  "close": float(r["Close"]),
                "volume": int(r["Volume"]),
            }
            for i, r in df.iterrows()
        ]
        return {"ticker": ticker.upper(), "range": range, "interval": interval, "series": out}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

# =========================
# NEWS + Optional summary/full analysis
# =========================
RANGE_TO_DAYS = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "9m": 270, "1y": 365}
_FETCH_SEM = asyncio.Semaphore(4)

def _sentence_split(txt: str):
    return re.split(r'(?<=[\.!?])\s+', txt.strip())

def _summarize_first_n_sentences(txt: str, n: int, max_chars: int) -> str:
    if not txt:
        return ""
    sents = _sentence_split(txt)
    summary = " ".join(sents[:max(1, n)]).strip()
    if len(summary) > max_chars:
        summary = summary[:max_chars].rsplit(" ", 1)[0] + "…"
    return summary

def _aggregate_summary(items):
    total = len(items)
    pos = sum(1 for x in items if x.get("sentiment") == "positive")
    neg = sum(1 for x in items if x.get("sentiment") == "negative")
    neu = total - pos - neg
    avg_stars = round(sum(x.get("stars", 3) for x in items) / total, 2) if total else None
    return {"total": total, "positive": pos, "neutral": neu, "negative": neg, "avg_stars": avg_stars}

@app.get("/extract")
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

@app.get("/news/{ticker}")
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

        # Try to enrich query with company name
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

        # Collect items
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

        # Sort newest first
        items.sort(key=lambda x: x.get("published") or "", reverse=True)

        # Pagination
        total = len(items)
        start = (page - 1) * per_page
        paginated = items[start : start + per_page]

        # Build analysis inputs
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
                # fetch article texts concurrently via the SAME minimal extractor used by /extract
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

            # Classify (off main thread)
            async with _CLASSIFY_SEM:
                sentiments = await asyncio.to_thread(classify_texts, texts_for_analysis)

            # Merge results
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

        # Page-level aggregate (only when analyzed)
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
        logger.exception("NEWS endpoint failed")
        raise HTTPException(status_code=503, detail=str(e))

# --------------- main ---------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

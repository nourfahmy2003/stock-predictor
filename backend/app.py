# app.py
import os, json, tempfile, asyncio, uuid, re, time, logging
import papermill as pm
import requests, feedparser
import yfinance as yf
from urllib.parse import quote_plus, urlparse, parse_qs
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

HF_TOKEN = os.getenv("HF_TOKEN")  # put your HF token in backend env
logger = logging.getLogger(__name__)


def _unwrap_google_news(url: str) -> str:
    qs = parse_qs(urlparse(url).query)
    return qs.get("url", [url])[0]


def _label_from_scores(scores):
    # scores is list of {label: '1 star'...'5 stars', score: float}
    best = max(scores, key=lambda x: x["score"])
    m = re.search(r"([1-5])", best["label"])
    stars = int(m.group(1)) if m else 3
    sentiment = "positive" if stars >= 4 else "negative" if stars <= 2 else "neutral"
    return {"sentiment": sentiment, "stars": stars, "confidence": float(best["score"])}


def classify_texts_via_api(texts: list[str]) -> list[dict]:
    # If no token, fallback to neutral
    if not HF_TOKEN:
        logger.info("HF_TOKEN not set; returning neutral sentiments")
        return [{"sentiment": "neutral", "stars": 3, "confidence": 0.0} for _ in texts]
    url = "https://api-inference.huggingface.co/models/tabularisai/multilingual-sentiment-analysis"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    out = []
    for t in texts:
        r = requests.post(url, headers=headers, json={"inputs": t, "options": {"wait_for_model": True}})
        r.raise_for_status()
        scores = r.json()[0]
        label = _label_from_scores(scores)
        logger.info("classify %r -> %s -> %s", t, scores, label)
        out.append(label)
    return out


NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")

app = FastAPI(title="Notebook Runner (Papermill)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# in-memory job store
jobs: dict[str, dict] = {}

# ---------- Shared blocking helper (runs papermill) ----------
def run_forecast_blocking(ticker: str, look_back: int, horizon: int) -> list[dict]:
    """Execute the notebook and return the forecast list (list of dicts)."""
    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")

        params = {
            "TICKER": ticker,
            "LOOKBACK": look_back,
            "HORIZON": horizon,
            "OUTPUT_JSON": out_json,
        }

        pm.execute_notebook(
            NOTEBOOK_PATH,
            out_nb,
            parameters=params,
            kernel_name="python3",
            progress=False,
        )

        if not os.path.exists(out_json):
            raise RuntimeError(
                "Notebook completed but no OUTPUT_JSON found. "
                "Did you write forecast_df.to_json(OUTPUT_JSON)?"
            )

        with open(out_json) as f:
            data = json.load(f)

        # Expecting `data` to be a list of {date, pred_price, pred_return, ...}
        return data

# ---------- Prediction model ----------
class PredictIn(BaseModel):
    ticker: str
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)

class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list

# ---------- Background job ----------
async def _run_job(job_id: str, payload: PredictIn):
    try:
        jobs[job_id] = {"state": "running", "progress": 0}
        # run the blocking notebook in a worker thread
        forecast = await asyncio.to_thread(
            run_forecast_blocking, payload.ticker.upper(), payload.look_back, payload.horizon
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

# ---------- Routes ----------
@app.get("/health")
def health():
    return {"status": "ok", "notebook": NOTEBOOK_PATH}

@app.post("/predict")
async def start_prediction(payload: PredictIn):
    job_id = create_job(payload)
    # return camelCase job id for frontend consistency
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

# Synchronous endpoint still available for debugging/manual calls
@app.get("/forecast", response_model=ForecastOut)
def forecast(
    ticker: str = Query(..., description="e.g. AAPL or BTC-USD"),
    look_back: int = Query(60, ge=10, le=365),
    horizon: int = Query(10, ge=1, le=60),
):
    try:
        forecast = run_forecast_blocking(ticker.upper(), look_back, horizon)
        return ForecastOut(ticker=ticker.upper(), look_back=look_back, horizon=horizon, forecast=forecast)
    except Exception as e:
        raise HTTPException(500, f"Notebook failed: {e}")
    
@app.get("/overview/{ticker}")
def overview(ticker: str):
    try:
        t = yf.Ticker(ticker.upper())
        fi = getattr(t, "fast_info", {}) or {}

        price = fi.get("last_price") or fi.get("last_close") or fi.get("regular_market_price")
        prev = fi.get("previous_close") or fi.get("last_close")
        day_low = fi.get("day_low")
        day_high = fi.get("day_high")
        volume = fi.get("last_volume") or fi.get("regular_market_volume")
        market_cap = fi.get("market_cap")
        currency = fi.get("currency") or "USD"
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

        change = None
        change_pct = None
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
            "1d": "1d",
            "5d": "5d",
            "1mo": "1mo",
            "3mo": "3mo",
            "6mo": "6mo",
            "1y": "1y",
            "2y": "2y",
            "5y": "5y",
            "10y": "10y",
            "ytd": "ytd",
            "max": "max",
        }
        period = period_map.get(range, "1y")
        df = yf.Ticker(ticker.upper()).history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail="No chart data")
        out = [
            {
                "date": i.isoformat(),
                "open": float(r["Open"]),
                "high": float(r["High"]),
                "low": float(r["Low"]),
                "close": float(r["Close"]),
                "volume": int(r["Volume"]),
            }
            for i, r in df.iterrows()
        ]
        return {
            "ticker": ticker.upper(),
            "range": range,
            "interval": interval,
            "series": out,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

RANGE_TO_DAYS = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "9m": 270, "1y": 365}


@app.get("/news/{ticker}")
def news(
    ticker: str,
    range: str = Query("1w", pattern="^(1w|1m|3m|6m|9m|1y)$"),
    analyze: bool = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
=======
):
    try:
        days = RANGE_TO_DAYS.get(range, 7)

        # Try to get company name to improve query
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
            sentiments = classify_texts_via_api([it["title"] for it in paginated])
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

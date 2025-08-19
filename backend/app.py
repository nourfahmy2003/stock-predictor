import os, json, tempfile, asyncio, uuid
import papermill as pm
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Path to your notebook (copy your .ipynb into notebooks/ on the server)
NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")

app = FastAPI(title="Notebook Runner (Papermill)")

# CORS so your frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# simple in-memory job store
jobs: dict[str, dict] = {}


async def _run_job(job_id: str, payload: dict):
    """Background placeholder that marks a job as done."""
    # replace with actual long-running prediction logic
    await asyncio.sleep(0)
    jobs[job_id] = {"state": "done", "result": payload}


def create_job(payload: dict) -> str:
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "running"}
    asyncio.create_task(_run_job(job_id, payload))
    return job_id


def get_job_status(job_id: str | None):
    if job_id is None:
        return None
    return jobs.get(job_id)

class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list

@app.get("/health")
def health():
    return {"status": "ok", "notebook": NOTEBOOK_PATH}


@app.post("/predict")
async def start_prediction(payload: dict):
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

@app.get("/forecast", response_model=ForecastOut)
def forecast(
    ticker: str = Query(..., description="e.g. AAPL or BTC-USD"),
    look_back: int = Query(60, ge=10, le=365),
    horizon: int = Query(10, ge=1, le=60),
):
    # Papermill will parameterize the notebook and execute it
    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")

        params = {
            "TICKER": ticker,
            "LOOKBACK": look_back,
            "HORIZON": horizon,
            "OUTPUT_JSON": out_json,
        }

        try:
            pm.execute_notebook(
                NOTEBOOK_PATH,
                out_nb,
                parameters=params,
                kernel_name="python3",
                progress=False,
            )
        except Exception as e:
            raise HTTPException(500, f"Notebook failed: {e}")

        if not os.path.exists(out_json):
            raise HTTPException(500, "Notebook completed but no OUTPUT_JSON found. Did you write forecast_df.to_json(OUTPUT_JSON)?")

        with open(out_json) as f:
            data = json.load(f)

        return ForecastOut(
            ticker=ticker, look_back=look_back, horizon=horizon, forecast=data
        )


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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

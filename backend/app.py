import os, json, tempfile
import papermill as pm
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
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

class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list

@app.get("/health")
def health():
    return {"status": "ok", "notebook": NOTEBOOK_PATH}

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
        fi = t.fast_info
        price = float(fi.get("last_price") or fi.get("last_close") or 0)
        day_low = fi.get("day_low"); day_high = fi.get("day_high")
        volume = fi.get("last_volume"); market_cap = fi.get("market_cap")
        currency = fi.get("currency")
        pe_ratio = None
        try:
            info = t.info or {}
            pe_ratio = info.get("trailingPE")
        except Exception:
            pass
        return {
            "ticker": ticker.upper(),
            "price": price,
            "change": None,
            "changePercent": None,
            "volume": volume,
            "peRatio": pe_ratio,
            "marketCap": market_cap,
            "dayRange": {"low": day_low, "high": day_high},
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

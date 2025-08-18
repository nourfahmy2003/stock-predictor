import os, json, tempfile
import papermill as pm
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Path to your notebook (copy your .ipynb into notebooks/ on the server)
NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")

app = FastAPI(title="Notebook Runner (Papermill)")

# CORS so your frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

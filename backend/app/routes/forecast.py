import os
import json
import tempfile
import asyncio
import uuid

import papermill as pm
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.schemas import PredictIn, ForecastOut
from app.services.sentiment import MODEL_ID

# Default notebook path now points to unified backtest+forecast notebook
NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/LSTM-10day.ipynb")

router = APIRouter()

jobs: dict[str, dict] = {}


def run_forecast_blocking(ticker: str, look_back: int, horizon: int) -> dict:
    """Execute the unified backtest/forecast notebook and return its JSON payload."""
    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")
        params = {
            "TICKER": ticker,
            # Fixed context/backtest settings to match notebook defaults
            "CONTEXT": 100,
            "LOOKBACK": look_back,
            "H_BACK": 20,
            "H_FORE": horizon,
            "SAVE_JSON": True,
            "OUT_JSON": out_json,
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
                "Notebook completed but OUT_JSON not found. "
                "Ensure the notebook writes the combined payload to OUT_JSON"
            )
        with open(out_json) as f:
            return json.load(f)


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


@router.get("/health")
def health():
    return {
        "status": "ok",
        "notebook": NOTEBOOK_PATH,
        "sentiment_backend": "local-transformers",
        "sentiment_model": MODEL_ID,
    }


@router.post("/predict")
async def start_prediction(payload: PredictIn):
    job_id = create_job(payload)
    return JSONResponse({"jobId": job_id}, status_code=202)


@router.get("/status")
async def status(req: Request):
    qp = req.query_params
    job_id = qp.get("jobId") or qp.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="Missing jobId/job_id")
    st = get_job_status(job_id)
    if st is None:
        raise HTTPException(status_code=404, detail="Unknown jobId")
    return st


@router.get("/forecast", response_model=ForecastOut)
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

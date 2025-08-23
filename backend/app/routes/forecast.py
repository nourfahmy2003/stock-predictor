# app/routes/forecast.py
from __future__ import annotations

import os
import json
import tempfile
import asyncio
import uuid
from typing import Any, Dict, List

import papermill as pm
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")

router = APIRouter()

# ---------------------------
# Minimal inline schemas
# ---------------------------

class PredictIn(BaseModel):
    ticker: str = Field(..., description="e.g. AAPL or BTC-USD")
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)
    context: int = Field(100, ge=30, le=365)
    backtest_horizon: int = Field(20, ge=1, le=90)

class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    context: int
    backtest_horizon: int
    horizon: int
    metrics: Dict[str, float]
    forecast: List[Dict[str, Any]]

# ---------------------------
# Job storage (optional async flow)
# ---------------------------

jobs: dict[str, dict] = {}

# ---------------------------
# Notebook runner
# ---------------------------

def run_forecast_blocking(
    ticker: str,
    look_back: int,
    context: int,
    backtest_horizon: int,
    horizon: int
) -> Dict[str, Any]:
    """
    Executes the parameterized notebook and returns its JSON result.
    """
    if not os.path.exists(NOTEBOOK_PATH):
        raise RuntimeError(f"Notebook not found: {NOTEBOOK_PATH}")

    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")

        params = {
            "TICKER": ticker,
            "LOOKBACK": look_back,
            "CONTEXT": context,
            "BACKTEST_HORIZON": backtest_horizon,
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
            raise RuntimeError(f"Notebook failed to execute: {e}")

        if not os.path.exists(out_json):
            raise RuntimeError(
                "Notebook completed but OUTPUT_JSON not found.\n"
                "Make sure the notebook writes a JSON file at OUTPUT_JSON."
            )

        with open(out_json) as f:
            data = json.load(f)

        # light validation
        required_top = ["ticker", "look_back", "context", "backtest_horizon", "horizon", "metrics", "forecast"]
        missing = [k for k in required_top if k not in data]
        if missing:
            raise RuntimeError(f"Notebook JSON missing keys: {missing}")

        return data

async def _run_job(job_id: str, payload: PredictIn):
    try:
        jobs[job_id] = {"state": "running", "progress": 0}
        result = await asyncio.to_thread(
            run_forecast_blocking,
            payload.ticker.upper(),
            payload.look_back,
            payload.context,
            payload.backtest_horizon,
            payload.horizon,
        )
        jobs[job_id] = {"state": "done", "result": result}
    except Exception as e:
        jobs[job_id] = {"state": "error", "message": str(e)}

def create_job(payload: PredictIn) -> str:
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "queued"}
    asyncio.create_task(_run_job(job_id, payload))
    return job_id

def get_job_status(job_id: str | None):
    if not job_id:
        return None
    return jobs.get(job_id)

# ---------------------------
# Routes
# ---------------------------

@router.get("/health")
def health():
    return {
        "status": "ok",
        "notebook": NOTEBOOK_PATH,
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
    context: int = Query(100, ge=30, le=365),
    backtest_horizon: int = Query(20, ge=1, le=90),
    horizon: int = Query(10, ge=1, le=60),
):
    try:
        data = run_forecast_blocking(
            ticker.upper(), look_back, context, backtest_horizon, horizon
        )
        # FastAPI will validate against ForecastOut and serialize
        return data
    except Exception as e:
        raise HTTPException(500, f"Notebook failed: {e}")

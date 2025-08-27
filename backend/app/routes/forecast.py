# app/routes/forecast.py
from __future__ import annotations

import os
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

# Global predictor (saved model + scaler + per-ticker calibrator)
from ..services.global_model import GlobalPredictor, GlobalConfig, to_forecast_json

router = APIRouter(prefix="/forecast", tags=["forecast"])

# ---------- Schemas (unchanged shape for FE) ----------
class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    context: int
    backtest_horizon: int
    horizon: int
    metrics: Dict[str, float]
    forecast: List[Dict[str, Any]]

class PredictIn(BaseModel):
    ticker: str = Field(..., description="e.g. AAPL or BTC-USD")
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)
    context: int = Field(100, ge=30, le=365)
    backtest_horizon: int = Field(20, ge=1, le=90)

# ---------- Lazy singleton for the global model ----------
_gp: GlobalPredictor | None = None

def _ensure_loaded():
    global _gp
    if _gp is None:
        cfg = GlobalConfig(
            models_dir=os.getenv("MODELS_DIR", "models"),
            look_back=int(os.getenv("LOOK_BACK", "60")),
            horizon=int(os.getenv("HORIZON", "10")),
        )
        _gp = GlobalPredictor(cfg)

# ---------- Routes ----------
@router.get("/health")
def health():
    try:
        _ensure_loaded()
        return {"status": "ok", "mode": "global", "models_dir": _gp.cfg.models_dir}
    except Exception as e:
        # Model not found / not trained yet
        raise HTTPException(500, f"Global model not ready: {e}")

@router.get("/refresh")
def refresh_models():
    """
    Hot-reload global model & scaler (call after nightly training).
    """
    try:
        global _gp
        _gp = None
        _ensure_loaded()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to reload global model: {e}")

@router.get("", response_model=ForecastOut)  # GET /forecast
def forecast(
    ticker: str = Query(..., description="e.g. AAPL or BTC-USD"),
    look_back: int = Query(60, ge=10, le=365),          # kept for compatibility
    context: int = Query(100, ge=30, le=365),           # kept for compatibility
    backtest_horizon: int = Query(20, ge=1, le=90),     # kept for compatibility
    horizon: int = Query(10, ge=1, le=60),              # kept for compatibility
):
    """
    Returns the same JSON shape as before, but powered by the saved global model.
    """
    _ensure_loaded()
    try:
        # The global predictor uses its configured look_back/horizon internally
        # to keep behavior stable. If you truly want to honor query values, you
        # can thread them through GlobalConfig instead.
        data = to_forecast_json(ticker.upper(), _gp)
        return data
    except Exception as e:
        raise HTTPException(500, f"Global model inference failed: {e}")

@router.post("/predict", response_model=ForecastOut)
def predict_alias(payload: PredictIn):
    """
    Compatibility alias that returns the same JSON as GET /forecast.
    NOTE: Final path = /forecast/predict (because of the router prefix).
    """
    _ensure_loaded()
    return to_forecast_json(payload.ticker.upper(), _gp)


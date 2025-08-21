from fastapi import APIRouter, HTTPException, Query
from app.schemas import BacktestOut
from app.services.backtest import run_backtest

router = APIRouter()

@router.get("/backtest", response_model=BacktestOut)
def backtest(
    ticker: str = Query(..., description="e.g. AAPL"),
    look_back: int = Query(60, ge=10, le=365),
    horizon: int = Query(10, ge=1, le=60),
    start: str = Query("2018-01-01"),
    end: str | None = Query(None),
):
    try:
        return run_backtest(ticker.upper(), look_back, horizon, start, end)
    except Exception as e:
        raise HTTPException(500, f"Backtest failed: {e}")

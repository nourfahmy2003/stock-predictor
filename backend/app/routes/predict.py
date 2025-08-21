from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from app.services.forecasting import run_forecast_blocking
from app.services.jobs import create_job, get_job_status

router = APIRouter()


class PredictIn(BaseModel):
    ticker: str
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)


class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list


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
        forecast = run_forecast_blocking(ticker.upper(), look_back, horizon)
        return ForecastOut(ticker=ticker.upper(), look_back=look_back, horizon=horizon, forecast=forecast)
    except Exception as e:
        raise HTTPException(500, f"Notebook failed: {e}")

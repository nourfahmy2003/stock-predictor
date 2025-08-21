import asyncio
import uuid
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.schemas import BacktestRunIn, BacktestStatus, BacktestResult
from app.services.backtest import simulate_backtest

router = APIRouter()

jobs: dict[str, BacktestStatus | dict] = {}


async def _run_job(job_id: str, payload: BacktestRunIn):
    try:
        jobs[job_id] = {"state": "running", "pct": 0}

        def cb(p):
            jobs[job_id] = {"state": "running", "pct": int(p)}

        result = await asyncio.to_thread(simulate_backtest, payload, cb)
        jobs[job_id] = {"state": "done", "pct": 100, "result": result}
    except Exception as e:
        jobs[job_id] = {"state": "error", "pct": 100, "message": str(e)}


@router.post("/backtest/run")
async def start_backtest(payload: BacktestRunIn):
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "queued", "pct": 0}
    asyncio.create_task(_run_job(job_id, payload))
    return JSONResponse({"jobId": job_id}, status_code=202)


@router.get("/backtest/status", response_model=BacktestStatus)
async def job_status(jobId: str = Query(...)):
    st = jobs.get(jobId)
    if not st:
        raise HTTPException(404, "Unknown jobId")
    return st


@router.get("/backtest/result", response_model=BacktestResult)
async def job_result(jobId: str = Query(...)):
    st = jobs.get(jobId)
    if not st or st.get("state") != "done" or "result" not in st:
        raise HTTPException(404, "Result not ready")
    return st["result"]


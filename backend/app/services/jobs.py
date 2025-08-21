import asyncio
import uuid
from typing import Optional
from app.services.forecasting import run_forecast_blocking

jobs: dict[str, dict] = {}


async def _run_job(job_id: str, payload) -> None:
    try:
        jobs[job_id] = {"state": "running", "progress": 0}
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


def create_job(payload) -> str:
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "queued"}
    asyncio.create_task(_run_job(job_id, payload))
    return job_id


def get_job_status(job_id: Optional[str]):
    if job_id is None:
        return None
    return jobs.get(job_id)

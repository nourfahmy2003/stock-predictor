"""Analysis engine HTTP endpoints."""
from __future__ import annotations

from typing import Iterable, Set

from fastapi import APIRouter, HTTPException, Query

from app.core import config_analysis as analysis_cfg
from app.services.analysis.composers.report import compose_report

router = APIRouter()


def _allowed_intervals() -> Set[str]:
    if hasattr(analysis_cfg, "ALLOWED_INTERVALS"):
        allowed = getattr(analysis_cfg, "ALLOWED_INTERVALS")
        if isinstance(allowed, Iterable):
            return {str(v) for v in allowed}
    profiles = getattr(analysis_cfg, "INDICATOR_CONFIG", {})
    if isinstance(profiles, dict):
        return {str(key) for key in profiles.keys()}
    return {"1m", "5m", "15m", "30m", "60m"}


@router.get("/analysis/report")
def analysis_report(symbol: str = Query(...), interval: str = Query("5m")):
    if not symbol or not symbol.strip():
        raise HTTPException(status_code=422, detail="Symbol query parameter is required.")

    interval = interval or "5m"
    allowed = _allowed_intervals()
    if interval not in allowed:
        raise HTTPException(status_code=422, detail=f"Interval must be one of: {sorted(allowed)}")

    try:
        report = compose_report(symbol, interval)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        # compose_report already validates interval; treat remaining issues as bad input
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unexpected error") from exc

    return report

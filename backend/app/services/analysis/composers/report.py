"""Composer module that assembles the full analysis report."""
from __future__ import annotations

from typing import Any, Dict

import pandas as pd

from app.core import config_analysis as analysis_cfg
from app.services.analysis.data.fetch import fetch_stock_data, get_daily_pivots
from app.services.analysis.indicators.compute import compute_indicators
from app.services.analysis.rules.trend import detect_trend
from app.services.analysis.rules.templates import compile_templates
from app.services.analysis.rules.decision import make_decision


def _normalize_symbol(symbol: str) -> str:
    if hasattr(analysis_cfg, "normalize_symbol"):
        return analysis_cfg.normalize_symbol(symbol)
    return symbol.strip().upper()


def _allowed_intervals() -> set[str]:
    if hasattr(analysis_cfg, "ALLOWED_INTERVALS"):
        allowed = getattr(analysis_cfg, "ALLOWED_INTERVALS")
        if isinstance(allowed, (list, tuple, set)):
            return set(allowed)
    return set(getattr(analysis_cfg, "INDICATOR_CONFIG", {}).keys()) or {"1m", "5m", "15m", "30m", "60m"}


def _get_thresholds(interval: str) -> Dict[str, Any]:
    if hasattr(analysis_cfg, "get_thresholds"):
        try:
            thresholds = analysis_cfg.get_thresholds(interval)
            if isinstance(thresholds, dict):
                return thresholds.copy()
        except Exception:
            pass
    base = getattr(analysis_cfg, "THRESHOLDS", {})
    return dict(base)


def _classic_pivots(hlc: Dict[str, Any]) -> Dict[str, float]:
    try:
        high = float(hlc["high"])
        low = float(hlc["low"])
        close = float(hlc["close"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid high/low/close data for pivots") from exc

    p = (high + low + close) / 3
    r1 = (2 * p) - low
    s1 = (2 * p) - high
    range_hl = high - low
    r2 = p + range_hl
    s2 = p - range_hl
    r3 = high + 2 * (p - low)
    s3 = low - 2 * (high - p)

    return {
        "P": round(p, 2),
        "S1": round(s1, 2),
        "S2": round(s2, 2),
        "S3": round(s3, 2),
        "R1": round(r1, 2),
        "R2": round(r2, 2),
        "R3": round(r3, 2),
    }


def compose_report(symbol: str, interval: str) -> Dict[str, Any]:
    """High level orchestration for the analysis report."""

    if not symbol or not symbol.strip():
        raise ValueError("Symbol is required")

    norm_symbol = _normalize_symbol(symbol)

    allowed_intervals = _allowed_intervals()
    interval = interval or "5m"
    if interval not in allowed_intervals:
        raise ValueError(f"Unsupported interval '{interval}'")

    # Fetch intraday history
    try:
        history_df = fetch_stock_data(norm_symbol, interval, include_prepost=True)
    except ValueError as exc:
        raise LookupError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch price history: {exc}") from exc
    if history_df is None or history_df.empty:
        raise LookupError("No intraday data returned")

    if not isinstance(history_df.index, pd.DatetimeIndex):
        history_df = history_df.copy()
        history_df.index = pd.to_datetime(history_df.index)

    history_df = history_df.sort_index()

    price = float(history_df["Close"].iloc[-1])
    as_of_ts = history_df.index[-1]
    as_of_iso = as_of_ts.to_pydatetime().isoformat() if hasattr(as_of_ts, "to_pydatetime") else str(as_of_ts)

    # Indicators (reuse configured helper)
    try:
        indicators = compute_indicators(norm_symbol, interval)
    except ValueError as exc:
        raise LookupError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to compute indicators: {exc}") from exc

    # Daily pivots
    try:
        daily_hlc = get_daily_pivots(norm_symbol, include_prepost=True)
    except ValueError as exc:
        raise LookupError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch daily pivots: {exc}") from exc
    pivots = _classic_pivots(daily_hlc)

    # Trend assessment
    try:
        trend, trend_details = detect_trend(
            indicators,
            price,
            history_df=history_df,
            interval=interval,
            symbol=norm_symbol,
        )
    except Exception as exc:
        raise RuntimeError(f"Failed to evaluate trend: {exc}") from exc

    thresholds = _get_thresholds(interval)

    template_inputs = {**indicators, "_trend_details": trend_details}
    indicator_texts = compile_templates(template_inputs, price, thresholds)

    decision_inputs = {**indicators, "_templates": indicator_texts, "_trend_details": trend_details}
    decision = make_decision(price, decision_inputs, pivots, trend, thresholds)

    report = {
        "symbol": norm_symbol,
        "interval": interval,
        "as_of": as_of_iso,
        "price": round(price, 2),
        "levels": pivots,
        "trend": trend,
        "indicators": indicator_texts,
        "decision": decision,
        "debug": {
            "trend_details": trend_details,
        },
        "disclaimer": "For education only. Not financial advice.",
    }
    return report

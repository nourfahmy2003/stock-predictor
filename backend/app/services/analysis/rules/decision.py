"""Trading plan synthesis based on indicator and trend context."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import math

ATR_MULT_SL = 1.5


def _first_key(data: Dict[str, Any], prefix: str) -> Optional[str]:
    for key in data:
        if key.startswith(prefix):
            return key
    return None


def _fmt(value: Any, decimals: int) -> Optional[str]:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(num):
        return None
    return f"{num:.{decimals}f}"


def _level_label(name: str, value: Any) -> str:
    fmt = _fmt(value, 2)
    return f"{name} (~{fmt})" if fmt is not None else name


def _get_threshold(thresholds: Dict[str, Any], key: str, default: float) -> float:
    try:
        return float(thresholds.get(key, default))
    except (TypeError, ValueError):
        return default


def make_decision(
    price: float,
    indicators: Dict[str, Any],
    pivots: Dict[str, Any],
    trend: str,
    thresholds: Dict[str, Any],
) -> Dict[str, Any]:
    """Turn the numeric analysis into a structured trade plan."""

    thresholds = thresholds or {}
    templates = indicators.get("_templates") if isinstance(indicators.get("_templates"), dict) else {}
    trend_details = indicators.get("_trend_details") if isinstance(indicators.get("_trend_details"), dict) else {}
    trend_reasons = trend_details.get("reasons", {}) if isinstance(trend_details, dict) else {}

    direction: str
    if trend == "Bullish":
        direction = "Long"
    elif trend == "Bearish":
        direction = "Short"
    else:
        direction = "Neutral"

    adx_value = indicators.get("adx")
    adx_fmt = _fmt(adx_value, 1)

    rationale_candidates: List[str] = []
    for key in ("ma_text", "macd_text", "adx_text"):
        text = templates.get(key)
        if text and text != "unavailable / skipped":
            rationale_candidates.append(text)
    for key in ("atr", "obv"):
        text = trend_reasons.get(key)
        if text and text not in rationale_candidates:
            rationale_candidates.append(text)
    if not rationale_candidates:
        summary = f"Trend: {trend}."
        if adx_fmt:
            summary = f"Trend: {trend} with ADX {adx_fmt}."
        rationale_candidates.append(summary)

    # Ensure 2-3 bullets
    rationale: List[str] = []
    seen = set()
    for text in rationale_candidates:
        if text in seen:
            continue
        rationale.append(text)
        seen.add(text)
        if len(rationale) == 3:
            break
    while len(rationale) < 2:
        fallback = "Price structure requires confirmation." if len(rationale) == 0 else "Watch momentum confirmation signals."
        if fallback in seen:
            break
        rationale.append(fallback)
        seen.add(fallback)

    ema_slow_key = _first_key(indicators, "ema_slow_")
    ema_slow_val = indicators.get(ema_slow_key) if ema_slow_key else None
    ema_slow_len = ema_slow_key.split("_")[-1] if ema_slow_key else "20"
    ema_label = f"EMA{ema_slow_len}"
    ema_fmt = _fmt(ema_slow_val, 2)

    vwap_val = indicators.get("vwap")
    vwap_fmt = _fmt(vwap_val, 2)

    s1 = pivots.get("S1")
    s2 = pivots.get("S2")
    s3 = pivots.get("S3")
    r1 = pivots.get("R1")
    r2 = pivots.get("R2")
    r3 = pivots.get("R3")
    p_pivot = pivots.get("P")

    atr_key = _first_key(indicators, "atr_")
    atr_val = float(indicators[atr_key]) if atr_key and _fmt(indicators.get(atr_key), 3) is not None else None
    atr_fmt = _fmt(atr_val, 3) if atr_val is not None else None

    price_fmt = _fmt(price, 2) or "price"

    if direction == "Long":
        entry_parts = []
        entry_parts.append(f"dips near {_level_label('S1', s1)}" if s1 is not None else "dips into support")
        reclaim_bits = []
        if ema_fmt is not None:
            reclaim_bits.append(f"{ema_label} ({ema_fmt})")
        else:
            reclaim_bits.append(ema_label)
        if vwap_fmt is not None:
            reclaim_bits.append(f"VWAP ({vwap_fmt})")
        else:
            reclaim_bits.append("VWAP")
        entry_parts.append("reclaim of " + " / ".join(reclaim_bits))
        entry_zone = "Look for entries on " + " or ".join(entry_parts) + "."

        if atr_val is None:
            stop_loss = "Stop guidance unavailable (ATR missing)."
        else:
            buffer_level = price - ATR_MULT_SL * atr_val
            buffer_fmt = _fmt(buffer_level, 2)
            stop_loss = (
                f"Place stop below {_level_label('S1', s1)}"
                + (f" or around {buffer_fmt} (1.5×ATR buffer)." if buffer_fmt else " (1.5×ATR buffer).")
            )

        targets = [
            _level_label("R1", r1),
            _level_label("R2", r2),
            _level_label("R3", r3),
        ]
        targets = [t for t in targets if not t.endswith("(~None)") and "None" not in t]

        risk_note = (
            f"Abandon if price closes below {ema_label}" + (f" ({ema_fmt})" if ema_fmt else "") +
            " and MACD histogram flips negative."
        )
    elif direction == "Short":
        entry_parts = []
        entry_parts.append(f"pops near {_level_label('R1', r1)}" if r1 is not None else "pops into resistance")
        rejection_bits = []
        if ema_fmt is not None:
            rejection_bits.append(f"{ema_label} ({ema_fmt})")
        else:
            rejection_bits.append(ema_label)
        if vwap_fmt is not None:
            rejection_bits.append(f"VWAP ({vwap_fmt})")
        else:
            rejection_bits.append("VWAP")
        entry_parts.append("rejection at " + " / ".join(rejection_bits))
        entry_zone = "Fade " + " or ".join(entry_parts) + "."

        if atr_val is None:
            stop_loss = "Stop guidance unavailable (ATR missing)."
        else:
            buffer_level = price + ATR_MULT_SL * atr_val
            buffer_fmt = _fmt(buffer_level, 2)
            stop_loss = (
                f"Place stop above {_level_label('R1', r1)}"
                + (f" or around {buffer_fmt} (1.5×ATR buffer)." if buffer_fmt else " (1.5×ATR buffer).")
            )

        targets = [
            _level_label("S1", s1),
            _level_label("S2", s2),
            _level_label("S3", s3),
        ]
        targets = [t for t in targets if not t.endswith("(~None)") and "None" not in t]

        risk_note = (
            "Abandon if price reclaims "
            + (f"VWAP ({vwap_fmt})" if vwap_fmt else "VWAP")
            + " and MACD histogram turns positive."
        )
    else:
        ema_piece = f"{ema_label}" + (f" ({ema_fmt})" if ema_fmt else "")
        entry_zone = (
            "Stay patient; wait for break or reclaim of "
            + (ema_piece if ema_piece else "EMA20")
            + " or pivot "
            + _level_label("P", p_pivot)
            + "."
        )
        if atr_val is None:
            stop_loss = "No trade; define stop once direction confirms."
        else:
            stop_loss = f"No trade yet; size risk after breakout (ATR {atr_fmt})."

        neutral_target = (
            "Watch "
            + _level_label("R1", r1)
            + " for upside break or "
            + _level_label("S1", s1)
            + " for downside trigger."
        )
        targets = [neutral_target]

        adx_gate = int(_get_threshold(thresholds, "adx_strong", 25))
        risk_note = (
            "Stand aside until price breaks above "
            + _level_label("R1", r1)
            + " or below "
            + _level_label("S1", s1)
            + f" with ADX > {adx_gate}."
        )

    decision = {
        "direction": direction,
        "rationale": rationale,
        "entry_zone": entry_zone,
        "stop_loss": stop_loss,
        "targets": targets,
        "risk_note": risk_note,
    }
    return decision

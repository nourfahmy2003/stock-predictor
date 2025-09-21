# app/services/analysis/rules/trend.py
from typing import Tuple, Dict, Any, Optional
import math

import numpy as np
import pandas as pd
import pandas_ta as ta

from app.core.config_analysis import THRESHOLDS
from app.services.analysis.data.fetch import fetch_stock_data


def _first_key(indicators: Dict[str, Any], prefix: str, *, required: bool = True) -> str:
    """Return the first indicator key matching prefix or raise if required."""
    for key in indicators:
        if key.startswith(prefix):
            return key
    if required:
        raise ValueError(f"detect_trend: missing indicator key starting with '{prefix}'")
    return ""


def _classify_atr_regime(
    df: pd.DataFrame,
    atr_len: int,
    baseline_lookback: int,
    elevated_mult: float,
    muted_mult: float,
) -> Tuple[str, float, float]:
    """
    Returns (regime, current_atr, baseline_atr)
    regime in {"elevated", "muted", "normal"}.
    """
    # Compute ATR series and drop NaNs
    atr_series = ta.atr(df["High"], df["Low"], df["Close"], length=atr_len).dropna()
    if len(atr_series) < max(atr_len, baseline_lookback):
        return "normal", float("nan"), float("nan")

    current = float(atr_series.iloc[-1])
    baseline = float(atr_series.tail(baseline_lookback).median())

    if not math.isfinite(current) or not math.isfinite(baseline) or baseline <= 0:
        return "normal", current, baseline

    if current >= baseline * elevated_mult:
        return "elevated", current, baseline
    elif current <= baseline * muted_mult:
        return "muted", current, baseline
    else:
        return "normal", current, baseline


def _classify_obv_state(
    df: pd.DataFrame,
    lookback: int,
    slope_min: float,
) -> Tuple[str, float]:
    """
    Returns (state, slope): state in {"rising", "falling", "flat"} based on a simple linear slope
    over the last `lookback` bars of OBV.
    """
    obv_series = ta.obv(df["Close"], df["Volume"]).dropna()
    if len(obv_series) < lookback + 5:
        return "flat", float("nan")

    y = obv_series.tail(lookback)
    x = np.arange(len(y), dtype=float)
    # Fit linear slope (degree 1)
    slope = float(np.polyfit(x, y.values.astype(float), 1)[0])

    if slope > slope_min:
        return "rising", slope
    elif slope < -slope_min:
        return "falling", slope
    else:
        return "flat", slope


def detect_trend(
    indicators: Dict[str, Any],
    price: float,
    *,
    # Optional: pass recent history to enable ATR/OBV context.
    # If not provided, ATR/OBV sections will be neutral/skipped gracefully.
    history_df: Optional[pd.DataFrame] = None,
    interval: Optional[str] = None,
    symbol: Optional[str] = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Decide the Current Trend using MA/MACD/BB/VWAP votes and an ADX gate.
    Also adds ATR (volatility regime) and OBV (volume flow) as context.

    Returns: (trend_string, details_dict)
    """
    # --- Pull required fields (raise clear errors if missing) ---
    ema_fast_key = _first_key(indicators, "ema_fast_")
    ema_slow_key = _first_key(indicators, "ema_slow_")
    rsi_key = _first_key(indicators, "rsi_")
    atr_key = _first_key(indicators, "atr_")

    try:
        ema_fast   = float(indicators[ema_fast_key])
        ema_slow   = float(indicators[ema_slow_key])
        rsi        = float(indicators[rsi_key])
        stoch_k    = float(indicators["stoch_k"])
        stoch_d    = float(indicators["stoch_d"])
        macd       = float(indicators["macd"])
        macd_sig   = float(indicators["macd_signal"])
        boll_upper = float(indicators["bollinger_upper"])
        boll_lower = float(indicators["bollinger_lower"])
        atr_val    = float(indicators[atr_key])   # latest ATR value (used for display; regime uses history)
        obv_val    = float(indicators["obv"])      # latest OBV value (absolute not used, but included for completeness)
        vwap       = float(indicators["vwap"])
        adx        = float(indicators["adx"])

    except KeyError as e:
        raise ValueError(f"detect_trend: missing indicator key: {e!s}")

    bull_votes, bear_votes = 0, 0
    reasons: Dict[str, str] = {}

    fast_len = ema_fast_key.rsplit("_", 1)[-1]
    slow_len = ema_slow_key.rsplit("_", 1)[-1]
    rsi_len = rsi_key.rsplit("_", 1)[-1]
    atr_len_label = atr_key.rsplit("_", 1)[-1]

    fast_label = f"EMA{fast_len}"
    slow_label = f"EMA{slow_len}"
    rsi_label = f"RSI{rsi_len}"
    atr_label = f"ATR{atr_len_label}"

    price_fmt = f"{price:.2f}"
    ema_fast_fmt = f"{ema_fast:.2f}"
    ema_slow_fmt = f"{ema_slow:.2f}"

    # --- Config thresholds ---
    adx_strong     = float(THRESHOLDS.get("adx_strong", 25))
    adx_weak       = float(THRESHOLDS.get("adx_weak", 20))
    bb_touch_pct   = float(THRESHOLDS.get("bb_touch_pct", 0.10))
    macd_small_thr = float(THRESHOLDS.get("macd_small_hist", 0.10))
    rsi_os         = float(THRESHOLDS.get("rsi_oversold", 30))
    rsi_ob         = float(THRESHOLDS.get("rsi_overbought", 70))

    # --- ATR/OBV config knobs (for contextual classification) ---
    atr_len             = 14
    atr_baseline_look   = int(THRESHOLDS.get("atr_baseline_lookback", 50))
    atr_elev_mult       = float(THRESHOLDS.get("atr_elevated_mult", 1.30))
    atr_muted_mult      = float(THRESHOLDS.get("atr_muted_mult", 0.80))

    obv_lookback        = int(THRESHOLDS.get("obv_lookback", 20))
    obv_slope_min       = float(THRESHOLDS.get("obv_slope_min", 0.0))
    # ---------- MA (vote) ----------
    if price > ema_fast > ema_slow:
        bull_votes += 1
        reasons["ma"] = (
            f"{fast_label}>{slow_label} and price>{fast_label} ({price_fmt}>{ema_fast_fmt}>{ema_slow_fmt}) → short-term bullish alignment."
        )
    elif price < ema_fast < ema_slow:
        bear_votes += 1
        reasons["ma"] = (
            f"{fast_label}<{slow_label} and price<{fast_label} ({price_fmt}<{ema_fast_fmt}<{ema_slow_fmt}) → short-term bearish alignment."
        )
    else:
        reasons["ma"] = (
            f"EMAs compressed/mixed ({fast_label} {ema_fast_fmt}, {slow_label} {ema_slow_fmt}, price {price_fmt}) → no clear MA bias."
        )

    # ---------- MACD (vote) ----------
    hist = macd - macd_sig
    strength = "weak" if abs(hist) < macd_small_thr else "firm"
    if hist > 0:
        bull_votes += 1
        reasons["macd"] = f"MACD>Signal with {strength} positive histogram ({hist:.3f}) → bullish momentum."
    elif hist < 0:
        bear_votes += 1
        reasons["macd"] = f"MACD<Signal with {strength} negative histogram ({hist:.3f}) → bearish momentum."
    else:
        reasons["macd"] = "MACD ~ Signal → momentum neutral."

    # ---------- Bollinger (vote) ----------
    width = boll_upper - boll_lower
    if width > 0:
        pct_b = (price - boll_lower) / width
        if pct_b >= 1 - bb_touch_pct:
            bull_votes += 1
            reasons["bb"] = f"Price near upper band (%B={pct_b:.2f}) → upside pressure."
        elif pct_b <= bb_touch_pct:
            bear_votes += 1
            reasons["bb"] = f"Price near lower band (%B={pct_b:.2f}) → downside pressure."
        else:
            reasons["bb"] = f"Price mid-band (%B={pct_b:.2f}) → neutral context."
    else:
        reasons["bb"] = "Bollinger width non-positive → skipped."

    # ---------- VWAP (vote) ----------
    if price > vwap:
        bull_votes += 1
        reasons["vwap"] = "Price above VWAP → intraday bullish control."
    elif price < vwap:
        bear_votes += 1
        reasons["vwap"] = "Price below VWAP → intraday bearish control."
    else:
        reasons["vwap"] = "Price at VWAP → balanced control."

    # ---------- RSI (context only) ----------
    if rsi <= rsi_os:
        reasons["rsi"] = f"{rsi_label} {rsi:.1f} → Oversold; bounce risk up."
    elif rsi >= rsi_ob:
        reasons["rsi"] = f"{rsi_label} {rsi:.1f} → Overbought; pullback risk up."
    elif 45 <= rsi <= 55:
        reasons["rsi"] = f"{rsi_label} {rsi:.1f} → Neutral."
    else:
        momentum = "bullish" if rsi > 55 else "bearish" if rsi < 45 else "neutral"
        reasons["rsi"] = f"{rsi_label} {rsi:.1f} → mild {momentum} momentum."

    # ---------- Stochastic (context only) ----------
    st_zone = "oversold" if stoch_k < 20 else "overbought" if stoch_k > 80 else "mid-range"
    if stoch_k > stoch_d:
        reasons["stoch"] = f"%K above %D in {st_zone} zone → momentum building."
    elif stoch_k < stoch_d:
        reasons["stoch"] = f"%K below %D in {st_zone} zone → momentum fading."
    else:
        reasons["stoch"] = f"%K ~ %D in {st_zone} → indecisive."

    # ---------- ATR (context only; needs recent history) ----------
    atr_regime = "normal"
    atr_baseline = float("nan")
    if history_df is None:
        # Try to fetch recent history if symbol+interval are provided
        if symbol and interval:
            try:
                history_df = fetch_stock_data(symbol, interval, include_prepost=True)
            except Exception:
                history_df = None

    if isinstance(history_df, pd.DataFrame) and not history_df.empty:
        atr_regime, atr_cur, atr_baseline = _classify_atr_regime(
            history_df, atr_len=atr_len,
            baseline_lookback=atr_baseline_look,
            elevated_mult=atr_elev_mult,
            muted_mult=atr_muted_mult,
        )
        if atr_regime == "elevated":
            reasons["atr"] = (
                f"{atr_label} {atr_cur:.3f} vs baseline {atr_baseline:.3f} → elevated volatility; expect wider swings."
            )
        elif atr_regime == "muted":
            reasons["atr"] = (
                f"{atr_label} {atr_cur:.3f} vs baseline {atr_baseline:.3f} → muted volatility; expect chop."
            )
        else:
            reasons["atr"] = (
                f"{atr_label} {atr_cur:.3f} ~ baseline {atr_baseline:.3f} → normal volatility."
            )
    else:
        # Fallback: still expose the current ATR value for visibility
        reasons["atr"] = f"{atr_label} {atr_val:.3f} (no baseline available)."

    # ---------- OBV (context/confirmation; needs recent history) ----------
    obv_state = "flat"
    obv_slope = float("nan")
    if isinstance(history_df, pd.DataFrame) and not history_df.empty:
        obv_state, obv_slope = _classify_obv_state(
            history_df,
            lookback=obv_lookback,
            slope_min=obv_slope_min,
        )
        if obv_state == "rising":
            reasons["obv"] = "OBV rising → accumulation context."
        elif obv_state == "falling":
            reasons["obv"] = "OBV falling → distribution context."
        else:
            reasons["obv"] = "OBV flat → neutral volume context."
    else:
        reasons["obv"] = "OBV state unavailable (no history)."

    # ---------- ADX (gate, not a vote) ----------
    if adx >= adx_strong:
        gate = "strong"
        reasons["adx"] = f"ADX {adx:.1f} → strong trend strength."
    elif adx >= adx_weak:
        gate = "moderate"
        reasons["adx"] = f"ADX {adx:.1f} → moderate trend strength."
    else:
        gate = "weak"
        reasons["adx"] = f"ADX {adx:.1f} → weak / range-like."

    # ---------- Decide final trend with ADX gate ----------
    if gate == "strong":
        if bull_votes > bear_votes:
            trend = "Bullish"
        elif bear_votes > bull_votes:
            trend = "Bearish"
        else:
            trend = "Consolidation"
    else:
        if bull_votes > bear_votes:
            trend = "Consolidation with Bullish Bias"
        elif bear_votes > bull_votes:
            trend = "Consolidation with Bearish Bias"
        else:
            trend = "Consolidation"

    details: Dict[str, Any] = {
        "bull_votes": bull_votes,
        "bear_votes": bear_votes,
        "gate": gate,
        "adx": adx,
        "reasons": reasons,
        "debug": {
            "hist": round(hist, 6),
            "macd_small_thr": macd_small_thr,
            "bb_touch_pct": bb_touch_pct,
            "boll_width": round(width, 6) if math.isfinite(width) else None,
            "price": round(float(price), 6),
            "ema_fast_key": ema_fast_key,
            "ema_slow_key": ema_slow_key,
            "rsi_key": rsi_key,
            "atr_key": atr_key,
            "ema_fast": round(ema_fast, 6),
            "ema_slow": round(ema_slow, 6),
            "rsi": round(rsi, 6),
            # ATR/OBV debug
            "atr_regime": atr_regime,
            "atr_baseline_lookback": atr_baseline_look,
            "atr_elev_mult": atr_elev_mult,
            "atr_muted_mult": atr_muted_mult,
            "atr_value": round(atr_val, 6),
            "atr_baseline": round(atr_baseline, 6) if math.isfinite(atr_baseline) else None,
            "obv_state": obv_state,
            "obv_lookback": obv_lookback,
            "obv_slope_min": obv_slope_min,
            "obv_slope": round(obv_slope, 6) if math.isfinite(obv_slope) else None,
        },
    }
    return trend, details

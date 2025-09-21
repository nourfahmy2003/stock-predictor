"""Indicator narration templates for the analysis engine."""
from __future__ import annotations

from typing import Any, Dict, Optional
import math


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


def _get_threshold(thresholds: Dict[str, Any], key: str, default: float) -> float:
    try:
        val = float(thresholds.get(key, default))
    except (TypeError, ValueError):
        return default
    return val


def compile_templates(indicators: Dict[str, Any], price: float, thresholds: Dict[str, Any]) -> Dict[str, str]:
    """Generate deterministic textual summaries for the latest indicators."""

    thresholds = thresholds or {}
    texts: Dict[str, str] = {}

    price_fmt = _fmt(price, 2)

    # Moving averages
    ema_fast_key = _first_key(indicators, "ema_fast_")
    ema_slow_key = _first_key(indicators, "ema_slow_")
    if price_fmt is None or not ema_fast_key or not ema_slow_key:
        texts["ma_text"] = "unavailable / skipped"
    else:
        fast_len = ema_fast_key.split("_")[-1]
        slow_len = ema_slow_key.split("_")[-1]
        ema_fast_fmt = _fmt(indicators.get(ema_fast_key), 2)
        ema_slow_fmt = _fmt(indicators.get(ema_slow_key), 2)
        if ema_fast_fmt is None or ema_slow_fmt is None:
            texts["ma_text"] = "unavailable / skipped"
        else:
            fast_label = f"EMA{fast_len}"
            slow_label = f"EMA{slow_len}"
            price_val = float(price)
            ema_fast_val = float(indicators[ema_fast_key])
            ema_slow_val = float(indicators[ema_slow_key])
            if price_val > ema_fast_val > ema_slow_val:
                texts["ma_text"] = (
                    f"{fast_label} ({ema_fast_fmt}) above {slow_label} ({ema_slow_fmt}); "
                    f"price above {fast_label} ({price_fmt}) → short-term bullish alignment."
                )
            elif price_val < ema_fast_val < ema_slow_val:
                texts["ma_text"] = (
                    f"{fast_label} ({ema_fast_fmt}) below {slow_label} ({ema_slow_fmt}); "
                    f"price below {fast_label} ({price_fmt}) → short-term bearish alignment."
                )
            else:
                texts["ma_text"] = (
                    f"EMAs compressed around price ({fast_label} {ema_fast_fmt}, {slow_label} {ema_slow_fmt}) → "
                    "no clear MA bias."
                )

    # MACD
    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    macd_hist_thr = _get_threshold(thresholds, "macd_small_hist", 0.10)
    macd_fmt = _fmt(macd, 3)
    macd_sig_fmt = _fmt(macd_signal, 3)
    if macd_fmt is None or macd_sig_fmt is None:
        texts["macd_text"] = "unavailable / skipped"
    else:
        hist = float(macd) - float(macd_signal)
        hist_fmt = _fmt(hist, 3)
        if hist_fmt is None:
            texts["macd_text"] = "unavailable / skipped"
        else:
            strength = "weak" if abs(hist) < macd_hist_thr else "firm"
            if hist > 0:
                texts["macd_text"] = (
                    f"MACD ({macd_fmt}) above Signal ({macd_sig_fmt}) with {strength} positive histogram ({hist_fmt}) → "
                    "bullish momentum."
                )
            elif hist < 0:
                texts["macd_text"] = (
                    f"MACD ({macd_fmt}) below Signal ({macd_sig_fmt}) with {strength} negative histogram ({hist_fmt}) → "
                    "bearish momentum."
                )
            else:
                texts["macd_text"] = (
                    f"MACD near Signal ({macd_fmt}~{macd_sig_fmt}) → momentum neutral."
                )

    # Bollinger Bands
    upper = indicators.get("bollinger_upper")
    lower = indicators.get("bollinger_lower")
    upper_fmt = _fmt(upper, 2)
    lower_fmt = _fmt(lower, 2)
    bb_touch_pct = _get_threshold(thresholds, "bb_touch_pct", 0.10)
    if price_fmt is None or upper_fmt is None or lower_fmt is None:
        texts["boll_text"] = "unavailable / skipped"
    else:
        width = float(upper) - float(lower)
        if not math.isfinite(width) or width <= 0:
            texts["boll_text"] = "Bollinger width invalid → skipped."
        else:
            pct_b = (float(price) - float(lower)) / width
            pct_b_fmt = _fmt(pct_b, 2) or "0.00"
            if pct_b >= 1 - bb_touch_pct:
                texts["boll_text"] = (
                    f"Price near upper band (%B {pct_b_fmt}) → upside pressure / risk of pullback."
                )
            elif pct_b <= bb_touch_pct:
                texts["boll_text"] = (
                    f"Price near lower band (%B {pct_b_fmt}) → downside pressure / risk of bounce."
                )
            else:
                texts["boll_text"] = (
                    f"Price around middle of bands (%B {pct_b_fmt}) → range-like context."
                )

    # RSI
    rsi_key = _first_key(indicators, "rsi_")
    if rsi_key:
        rsi_raw = indicators.get(rsi_key)
        rsi_fmt = _fmt(rsi_raw, 1)
        try:
            rsi_val = float(rsi_raw)
        except (TypeError, ValueError):
            rsi_val = None
        else:
            if not math.isfinite(rsi_val):
                rsi_val = None
    else:
        rsi_fmt = None
        rsi_val = None
    if rsi_fmt is None or rsi_val is None:
        texts["rsi_text"] = "unavailable / skipped"
    else:
        rsi_os = _get_threshold(thresholds, "rsi_oversold", 30)
        rsi_ob = _get_threshold(thresholds, "rsi_overbought", 70)
        if rsi_val <= rsi_os:
            texts["rsi_text"] = f"RSI14 {rsi_fmt} → Oversold; bounce risk up."
        elif rsi_val >= rsi_ob:
            texts["rsi_text"] = f"RSI14 {rsi_fmt} → Overbought; pullback risk up."
        elif 45 <= rsi_val <= 55:
            texts["rsi_text"] = f"RSI14 {rsi_fmt} → Neutral."
        elif rsi_val > 55:
            texts["rsi_text"] = f"RSI14 {rsi_fmt} → mild bullish momentum."
        else:
            texts["rsi_text"] = f"RSI14 {rsi_fmt} → mild bearish momentum."

    # Stochastic
    stoch_k = indicators.get("stoch_k")
    stoch_d = indicators.get("stoch_d")
    stoch_k_fmt = _fmt(stoch_k, 1)
    stoch_d_fmt = _fmt(stoch_d, 1)
    if stoch_k_fmt is None or stoch_d_fmt is None:
        texts["stoch_text"] = "unavailable / skipped"
    else:
        k_val = float(stoch_k)
        d_val = float(stoch_d)
        if k_val < 20:
            zone = "oversold"
        elif k_val > 80:
            zone = "overbought"
        else:
            zone = "mid-range"
        if k_val > d_val:
            state = "momentum building."
            relation = "above"
        elif k_val < d_val:
            state = "momentum fading."
            relation = "below"
        else:
            state = "momentum indecisive."
            relation = "~"
        texts["stoch_text"] = (
            f"%K ({stoch_k_fmt}) {relation} %D ({stoch_d_fmt}) in {zone} zone → {state}"
        )

    # ADX
    adx_val = indicators.get("adx")
    adx_fmt = _fmt(adx_val, 1)
    if adx_fmt is None:
        texts["adx_text"] = "unavailable / skipped"
    else:
        adx_num = float(adx_val)
        adx_strong = _get_threshold(thresholds, "adx_strong", 25)
        adx_weak = _get_threshold(thresholds, "adx_weak", 20)
        if adx_num >= adx_strong:
            texts["adx_text"] = f"ADX {adx_fmt} → strong trend conditions."
        elif adx_num >= adx_weak:
            texts["adx_text"] = f"ADX {adx_fmt} → moderate trend strength."
        else:
            texts["adx_text"] = f"ADX {adx_fmt} → weak / range-like."

    # VWAP
    vwap_val = indicators.get("vwap")
    vwap_fmt = _fmt(vwap_val, 2)
    if price_fmt is None or vwap_fmt is None:
        texts["vwap_text"] = "unavailable / skipped"
    else:
        price_val = float(price)
        vwap_num = float(vwap_val)
        if price_val > vwap_num:
            texts["vwap_text"] = f"Price above VWAP ({vwap_fmt}) → intraday bullish control."
        elif price_val < vwap_num:
            texts["vwap_text"] = f"Price below VWAP ({vwap_fmt}) → intraday bearish control."
        else:
            texts["vwap_text"] = f"Price at VWAP ({vwap_fmt}) → balanced control."

    # ATR with regime context from trend details when available
    atr_key = _first_key(indicators, "atr_")
    atr_fmt = _fmt(indicators.get(atr_key), 3) if atr_key else None
    trend_details = indicators.get("_trend_details") if isinstance(indicators.get("_trend_details"), dict) else None
    trend_debug = trend_details.get("debug") if trend_details else {}
    atr_regime = trend_debug.get("atr_regime") if isinstance(trend_debug, dict) else None
    atr_baseline_val = trend_debug.get("atr_baseline") if isinstance(trend_debug, dict) else None
    atr_baseline_fmt = _fmt(atr_baseline_val, 3) if atr_baseline_val is not None else None
    if atr_fmt is None:
        texts["atr_text"] = "unavailable / skipped"
    else:
        if atr_regime in {"elevated", "muted", "normal"} and atr_baseline_fmt:
            if atr_regime == "elevated":
                texts["atr_text"] = (
                    f"ATR14 {atr_fmt} vs baseline {atr_baseline_fmt} → elevated volatility; expect wider swings."
                )
            elif atr_regime == "muted":
                texts["atr_text"] = (
                    f"ATR14 {atr_fmt} vs baseline {atr_baseline_fmt} → muted volatility; expect chop."
                )
            else:
                texts["atr_text"] = (
                    f"ATR14 {atr_fmt} ~ baseline {atr_baseline_fmt} → normal volatility."
                )
        else:
            texts["atr_text"] = f"ATR14 {atr_fmt} (no baseline available)."

    # OBV context (prefer trend debug state)
    obv_state = None
    if isinstance(trend_debug, dict):
        obv_state = trend_debug.get("obv_state")
    if not obv_state:
        obv_state = indicators.get("_obv_state")
    if obv_state == "rising":
        texts["obv_text"] = "OBV rising → accumulation supports moves."
    elif obv_state == "falling":
        texts["obv_text"] = "OBV falling → distribution pressures rallies."
    elif obv_state == "flat":
        texts["obv_text"] = "OBV flat → neutral volume context."
    else:
        texts["obv_text"] = "OBV state unavailable (no history)."

    return texts

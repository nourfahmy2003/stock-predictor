from app.services.analysis.data.fetch import fetch_stock_data
from app.core.config_analysis import INDICATOR_CONFIG
import pandas_ta as ta


def compute_indicators(ticker: str, interval: str = "5m") -> dict:
    """Compute technical indicators using parameters from INDICATOR_CONFIG.

    The parameters are selected based on the provided interval. If an interval
    is not present in the config, it falls back to the "5m" profile.
    """

    df = fetch_stock_data(ticker, interval, include_prepost=True)
    if df.empty:
        raise ValueError(f"Not enough data for {ticker}")

    # Select config for interval with fallback
    cfg = INDICATOR_CONFIG.get(interval) or INDICATOR_CONFIG.get("5m", {})

    # Estimate minimum bars required based on configured lengths
    lengths = []
    if "ema" in cfg:
        lengths.extend([cfg["ema"].get("fast", 0), cfg["ema"].get("slow", 0)])
    if "rsi" in cfg:
        lengths.append(cfg["rsi"].get("length", 0))
    if "stoch" in cfg:
        lengths.append(cfg["stoch"].get("k", 0))
    if "macd" in cfg:
        # macd typically needs at least slow + signal warmup
        macd_slow = cfg["macd"].get("slow", 0)
        macd_signal = cfg["macd"].get("signal", 0)
        lengths.append(macd_slow + macd_signal)
    if "bb" in cfg:
        lengths.append(cfg["bb"].get("length", 0))
    if "atr" in cfg:
        lengths.append(cfg["atr"].get("length", 0))
    if "adx" in cfg:
        lengths.append(cfg["adx"].get("length", 0))

    required = max([l for l in lengths if isinstance(l, int) and l is not None] + [30])
    if len(df) < required:
        raise ValueError(f"Not enough data for {ticker} (need >= {required} bars)")

    results = {}

    # Trend - EMA fast/slow
    if "ema" in cfg:
        ema_fast_len = cfg["ema"].get("fast", 9)
        ema_slow_len = cfg["ema"].get("slow", 20)
        results[f"ema_fast_{ema_fast_len}"] = ta.ema(df["Close"], length=ema_fast_len).iloc[-1]
        results[f"ema_slow_{ema_slow_len}"] = ta.ema(df["Close"], length=ema_slow_len).iloc[-1]

    # Momentum - RSI
    if "rsi" in cfg:
        rsi_len = cfg["rsi"].get("length", 14)
        results[f"rsi_{rsi_len}"] = ta.rsi(df["Close"], length=rsi_len).iloc[-1]

    # Momentum - Stochastic
    if "stoch" in cfg:
        k = cfg["stoch"].get("k", 14)
        d = cfg["stoch"].get("d", 3)
        smooth_k = cfg["stoch"].get("smooth_k", 3)
        st = ta.stoch(df["High"], df["Low"], df["Close"], k=k, d=d, smooth_k=smooth_k)
        results["stoch_k"] = st[f"STOCHk_{k}_{d}_{smooth_k}"].iloc[-1]
        results["stoch_d"] = st[f"STOCHd_{k}_{d}_{smooth_k}"].iloc[-1]

    # MACD
    if "macd" in cfg:
        fast = cfg["macd"].get("fast", 12)
        slow = cfg["macd"].get("slow", 26)
        signal = cfg["macd"].get("signal", 9)
        macd = ta.macd(df["Close"], fast=fast, slow=slow, signal=signal)
        results["macd"] = macd[f"MACD_{fast}_{slow}_{signal}"].iloc[-1]
        results["macd_signal"] = macd[f"MACDs_{fast}_{slow}_{signal}"].iloc[-1]

    # Volatility - Bollinger Bands and ATR
    if "bb" in cfg:
        bb_len = cfg["bb"].get("length", 20)
        bb_std = cfg["bb"].get("std", 2.0)
        bbands = ta.bbands(df["Close"], length=bb_len, std=bb_std)
        # Be tolerant to pandas_ta naming variations
        upper_col = next((c for c in bbands.columns if c.startswith("BBU_")), None)
        lower_col = next((c for c in bbands.columns if c.startswith("BBL_")), None)
        if upper_col is not None:
            results["bollinger_upper"] = bbands[upper_col].iloc[-1]
        if lower_col is not None:
            results["bollinger_lower"] = bbands[lower_col].iloc[-1]
    if "atr" in cfg:
        atr_len = cfg["atr"].get("length", 14)
        results[f"atr_{atr_len}"] = ta.atr(df["High"], df["Low"], df["Close"], length=atr_len).iloc[-1]

    # Volume-based
    if "obv" in cfg:
        results["obv"] = ta.obv(df["Close"], df["Volume"]).iloc[-1]
    if "vwap" in cfg:
        # pandas_ta vwap uses rolling by default; 'session' in config is advisory
        results["vwap"] = ta.vwap(df["High"], df["Low"], df["Close"], df["Volume"]).iloc[-1]

    # Trend strength - ADX
    if "adx" in cfg:
        adx_len = cfg["adx"].get("length", 14)
        results["adx"] = ta.adx(df["High"], df["Low"], df["Close"], length=adx_len)[f"ADX_{adx_len}"].iloc[-1]
    return results

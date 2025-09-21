INDICATOR_CONFIG = {
    "1m": {
        "ema":  {"fast": 9,  "slow": 20},           # faster for scalps
        "rsi":  {"length": 14},
        "stoch":{"k": 9,  "d": 3, "smooth_k": 3},   # quicker stochastic
        "macd": {"fast": 8,  "slow": 21, "signal": 5},  # faster MACD
        "bb":   {"length": 20, "std": 2.0},
        "atr":  {"length": 10},                     # faster volatility
        "adx":  {"length": 10},                     # quicker trend read
        "vwap": {"session": "rolling"},
        "obv":  {}
    },
    "5m": {
        "ema":  {"fast": 9,  "slow": 20},
        "rsi":  {"length": 14},
        "stoch":{"k": 14, "d": 3, "smooth_k": 3},
        "macd": {"fast": 12, "slow": 26, "signal": 9},  # standard MACD
        "bb":   {"length": 20, "std": 2.0},
        "atr":  {"length": 14},
        "adx":  {"length": 14},
        "vwap": {"session": "rolling"},
        "obv":  {}
    },
    "15m": {
        "ema":  {"fast": 9,  "slow": 20},
        "rsi":  {"length": 14},
        "stoch":{"k": 14, "d": 3, "smooth_k": 3},
        "macd": {"fast": 12, "slow": 26, "signal": 9},
        "bb":   {"length": 20, "std": 2.0},
        "atr":  {"length": 14},
        "adx":  {"length": 14},
        "vwap": {"session": "rolling"},
        "obv":  {}
    },
    "30m": {
        "ema":  {"fast": 20, "slow": 50},           # smoother swing structure
        "rsi":  {"length": 14},
        "stoch":{"k": 21, "d": 3, "smooth_k": 3},
        "macd": {"fast": 12, "slow": 26, "signal": 9},
        "bb":   {"length": 20, "std": 2.0},
        "atr":  {"length": 14},
        "adx":  {"length": 14},
        "vwap": {"session": "rolling"},
        "obv":  {}
    },
    "60m": {
        "ema":  {"fast": 20, "slow": 50},
        "rsi":  {"length": 14},
        "stoch":{"k": 21, "d": 3, "smooth_k": 3},
        "macd": {"fast": 12, "slow": 26, "signal": 9},
        "bb":   {"length": 20, "std": 2.0},
        "atr":  {"length": 14},
        "adx":  {"length": 14},
        "vwap": {"session": "rolling"},
        "obv":  {}
    }
}


THRESHOLDS = {"bb_touch_pct": 0.10, 
              "adx_strong": 25,
              "adx_weak": 20,
              "rsi_oversold": 30,
              "rsi_overbought": 70,
              "stoch_oversold": 20,
              "stoch_overbought": 80,
              "macd_small_hist": 0.10}
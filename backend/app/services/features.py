# app/services/features.py
from __future__ import annotations
import numpy as np

def build_sequence_features(closes_1d: np.ndarray, look_back: int) -> np.ndarray:
    """
    Always returns (look_back, 3):
      [ close, 1-day-return, zscore_over_L ]

    - No rolling-window tricks that can produce empty columns
    - Works for any look_back >= 1
    """
    x = np.asarray(closes_1d, dtype=float).reshape(-1)
    if len(x) < look_back:
        raise RuntimeError(f"Need at least {look_back} closing prices (got {len(x)})")
    x = x[-look_back:]  # ensure exact L

    # 1-day returns, first element is 0 to align length
    rets = np.zeros_like(x)
    if len(x) > 1:
        denom = np.where(x[:-1] == 0.0, 1.0, x[:-1])
        rets[1:] = (x[1:] - x[:-1]) / denom

    # z-score computed over the last L points (stable; no empty slices)
    mean = float(x.mean())
    std  = float(x.std())
    if std < 1e-12:
        std = 1.0
    z = (x - mean) / std

    feats = np.stack([x, rets, z], axis=1)  # (L, 3)
    return feats

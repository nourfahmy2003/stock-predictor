# app/services/global_model.py
from __future__ import annotations

import os, json, joblib, numpy as np
from dataclasses import dataclass
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta

import yfinance as yf
from tensorflow import keras
from sklearn.linear_model import LogisticRegression

from .features import build_sequence_features  # <-- our safe, fixed-width features

DEBUG = os.getenv("DEBUG_GLOBAL", "0") == "1"
def _dbg(*a):
    if DEBUG:
        print("[global_model]", *a, flush=True)

# ---------------- Config ----------------
@dataclass
class GlobalConfig:
    models_dir: str = os.getenv("MODELS_DIR", "models")
    look_back: int  = int(os.getenv("LOOK_BACK", "90"))
    horizon:   int  = int(os.getenv("HORIZON", "10"))

    @property
    def model_path(self) -> str:  return os.path.join(self.models_dir, "global", "lstm_model.keras")
    @property
    def scaler_path(self) -> str: return os.path.join(self.models_dir, "global", "scaler.pkl")
    @property
    def meta_path(self) -> str:   return os.path.join(self.models_dir, "global", "meta.json")

# ------------- biz-day helpers ----------
def _business_days_after(d: datetime, k: int) -> datetime:
    out = d
    for _ in range(k):
        out += timedelta(days=1)
        while out.weekday() >= 5:
            out += timedelta(days=1)
    return out

def _biz_seq_forward(start_d: datetime, n: int) -> list[datetime]:
    d, out = start_d, []
    for _ in range(n):
        d = _business_days_after(d, 1)
        out.append(d)
    return out

def _biz_seq_backward(start_d: datetime, n: int) -> list[datetime]:
    d, out = start_d, []
    while len(out) < n:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            out.append(d)
    out.reverse()
    return out

def _realized_vol(closes: np.ndarray, n: int = 20) -> float:
    if len(closes) < n + 1:
        return 0.01
    rets = np.diff(closes[-(n+1):]) / closes[-(n+1):-1]
    v = float(np.std(rets))
    return max(0.003, min(v, 0.05))

# ---------------- Predictor -------------
class GlobalPredictor:
    def __init__(self, cfg: GlobalConfig):
        if not (os.path.exists(cfg.model_path) and os.path.exists(cfg.scaler_path)):
            raise RuntimeError(
                "Global model/scaler not found. Train first.\n"
                f"MODEL={cfg.model_path}\nSCALER={cfg.scaler_path}"
            )
        # adopt artifact hyperparams if present
        if os.path.exists(cfg.meta_path):
            try:
                with open(cfg.meta_path) as f:
                    meta = json.load(f)
                if "look_back" in meta: cfg.look_back = int(meta["look_back"])
                if "horizon"   in meta: cfg.horizon   = int(meta["horizon"])
            except Exception:
                pass

        self.cfg = cfg
        self.model  = keras.models.load_model(cfg.model_path)
        self.scaler = joblib.load(cfg.scaler_path)
        _dbg(f"INIT L={cfg.look_back} H={cfg.horizon} scaler_F={getattr(self.scaler,'n_features_in_',None)}")

    # ---- data fetch
    def _download_window(self, ticker: str, days: int) -> Tuple[np.ndarray, List[datetime]]:
        end = datetime.utcnow(); start = end - timedelta(days=days)
        df = yf.download(ticker, start=start, end=end, interval="1d", auto_adjust=True, progress=False)
        if df is None or df.empty:
            return np.array([], dtype=float), []
        s = df["Close"].astype(float).dropna()
        return s.values, s.index.to_pydatetime().tolist()

    def _fetch_prices_at_least_L(self, ticker: str, base_days: int) -> Tuple[np.ndarray, List[datetime]]:
        L = self.cfg.look_back
        for days in [base_days, max(L*6, 400), 1200]:
            c, d = self._download_window(ticker, days)
            _dbg(f"download {ticker} days={days} -> n={len(c)}")
            if len(c) >= L:
                return c, d
        c, d = self._download_window(ticker, max(L*2, 200))
        if len(c) == 0:
            raise RuntimeError(f"No data for {ticker}")
        if len(c) < L:
            _dbg(f"padding {ticker}: have={len(c)} need={L}")
            pad = np.full(L - len(c), c[0], dtype=float)
            c = np.concatenate([pad, c])
            first = d[0] if d else datetime.utcnow()
            pad_dates, dd = [], first
            while len(pad_dates) < (L - len(d)):
                dd -= timedelta(days=1)
                if dd.weekday() < 5:
                    pad_dates.append(dd)
            d = pad_dates[::-1] + d
        return c, d
    
    # ---- safe features + scaling
    def _seq_scaled(self, closes_or_feats: np.ndarray) -> np.ndarray:
        """
        Accepts 1D closes or (L, F) features.
        Produces (1, L, F_scaler) where F_scaler matches the saved StandardScaler.
        """
        L = self.cfg.look_back
        arr = np.asarray(closes_or_feats, dtype=float)

        if arr.ndim == 1 or (arr.ndim == 2 and arr.shape[1] == 1):
            vec = arr.reshape(-1)
            if len(vec) < L:
                raise RuntimeError(f"Need at least {L} closing prices (got {len(vec)})")
            X = build_sequence_features(vec, L)  # (L,3)
        elif arr.ndim == 2:
            if arr.shape[0] < L:
                raise RuntimeError(f"Need at least {L} rows to build a sequence (got {arr.shape[0]})")
            X = arr[-L:, :]
        else:
            raise RuntimeError(f"closes must be 1D or 2D, got shape {arr.shape}")

        want_F = int(getattr(self.scaler, "n_features_in_", X.shape[1]))
        if want_F <= 0:
            want_F = X.shape[1]

        if X.shape[1] != want_F:
            if X.shape[1] > want_F:
                X = X[:, :want_F]
            else:
                pad = np.repeat(X[:, [-1]], want_F - X.shape[1], axis=1)
                X = np.concatenate([X, pad], axis=1)

        _dbg(f"_seq_scaled: X.shape={X.shape} want_F={want_F}")
        Xs = self.scaler.transform(X)  # (L, want_F)
        return Xs[np.newaxis, ...]     # (1, L, want_F)

    # ---- inference
    def predict_logit(self, ticker: str) -> float:
        closes, _ = self._fetch_prices_at_least_L(ticker, base_days=self.cfg.look_back*3)
        X = self._seq_scaled(closes)
        return float(self.model.predict(X, verbose=0).ravel()[0])

    def _score_to_daily_ret(self, score: float, vol: float) -> float:
        base = np.tanh(score)                  # [-1, 1]
        exp_h = float(base) * (0.8 * vol * self.cfg.horizon)
        return exp_h / float(self.cfg.horizon)

    def forecast_series(self, ticker: str) -> List[Dict[str, Any]]:
        L, H = self.cfg.look_back, self.cfg.horizon
        closes, dates = self._fetch_prices_at_least_L(ticker, base_days=L + 180)
        vol = _realized_vol(closes, n=20)

        rows: List[Dict[str, Any]] = [
            {"date": d.strftime("%Y-%m-%d"), "actual": float(v), "part": "history"}
            for d, v in zip(dates[-20:], closes[-20:])
        ]

        # back-bridge to align orange with today
        bridge_dates = _biz_seq_backward(dates[-1], H)
        tmp_seq = closes[:-1].copy()
        tmp_last = float(closes[-2] if len(closes) >= 2 else closes[-1])
        bridge_preds: List[float] = []
        for _ in bridge_dates:
            X = self._seq_scaled(tmp_seq)
            score = float(self.model.predict(X, verbose=0).ravel()[0])
            daily = self._score_to_daily_ret(score, vol)
            nxt = tmp_last * (1.0 + daily)
            if not np.isfinite(nxt) or nxt <= 0:
                nxt = tmp_last
            bridge_preds.append(nxt)
            tmp_seq = np.append(tmp_seq, nxt)[-L:]
            tmp_last = nxt

        rows += [
            {"date": bd.strftime("%Y-%m-%d"), "predicted": float(p), "part": "backtest"}
            for bd, p in zip(bridge_dates, bridge_preds)
        ]

        # future H business days
        fut_dates = _biz_seq_forward(dates[-1], H)
        seq = closes.copy()
        last_price = float(seq[-1])
        preds: List[float] = []
        for _ in range(H):
            X = self._seq_scaled(seq)
            score = float(self.model.predict(X, verbose=0).ravel()[0])
            daily = self._score_to_daily_ret(score, vol)
            nxt = last_price * (1.0 + daily)
            if not np.isfinite(nxt) or nxt <= 0:
                nxt = last_price
            preds.append(nxt)
            seq = np.append(seq, nxt)[-L:]
            last_price = nxt

        rows += [
            {"date": fd.strftime("%Y-%m-%d"), "predicted": float(p), "part": "forecast"}
            for fd, p in zip(fut_dates, preds)
        ]

        rows.sort(key=lambda r: r["date"])
        return rows

    def make_backtest_rows(self, ticker: str, days: int = 20) -> List[Dict[str, Any]]:
        L, H = self.cfg.look_back, self.cfg.horizon
        closes, dates = self._fetch_prices_at_least_L(ticker, base_days=L + H + days + 120)
        if len(closes) < L + H + 5:
            _dbg(f"backtest short: have={len(closes)} need>={L+H+5}")
            return []

        vol = _realized_vol(closes, n=20)
        anchors = list(range(L, len(closes) - H))[-max(days, H):]
        rows: List[Dict[str, Any]] = []
        for i in anchors:
            win = closes[i - L:i]
            X = self._seq_scaled(win)
            score = float(self.model.predict(X, verbose=0).ravel()[0])
            exp_h = self._score_to_daily_ret(score, vol) * H
            pred = float(closes[i]) * (1.0 + exp_h)
            j = i + H
            rows.append({
                "date": dates[j].strftime("%Y-%m-%d"),
                "actual": float(closes[j]),
                "predicted": float(pred),
                "part": "backtest",
            })
        rows.sort(key=lambda r: r["date"])
        return rows

# ------------- Calibrator --------------
def _fit_calibrator_on_demand_factory(gp: "GlobalPredictor"):
    months = int(os.getenv("CAL_WINDOW_MONTHS", "9"))
    L, H = gp.cfg.look_back, gp.cfg.horizon

    def fit_fn(ticker: str) -> Dict[str, float]:
        end = datetime.utcnow(); start = end - timedelta(days=30 * months)
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
        if df is None or df.empty or len(df) < L + H + 50:
            return {"A": 1.0, "B": 0.0}
        s = df["Close"].astype(float).dropna().values
        scores, y = [], []
        for i in range(L, len(s) - H):
            win = s[i - L:i]
            X = gp._seq_scaled(win)
            sc = float(gp.model.predict(X, verbose=0).ravel()[0])
            fut = s[i + H] / s[i] - 1.0
            scores.append(sc); y.append(1 if fut > 0 else 0)
        if len(scores) < 50:
            return {"A": 1.0, "B": 0.0}
        lr = LogisticRegression(max_iter=500).fit(np.array(scores).reshape(-1,1), np.array(y))
        return {"A": float(lr.coef_.ravel()[0]), "B": float(lr.intercept_.ravel()[0])}
    return fit_fn

def apply_calibrator(raw: float, cal: Dict[str, float]) -> float:
    from math import exp
    A, B = cal.get("A", 1.0), cal.get("B", 0.0)
    z = A * raw + B
    return 1.0 / (1.0 + exp(-z))

def ensure_calibrator(ticker: str, fit_fn):
    path = os.path.join(os.getenv("MODELS_DIR", "models"), "calibrators", f"{ticker.upper()}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    cal = fit_fn(ticker)
    with open(path, "w") as f:
        json.dump(cal, f)
    return cal

# --------------- API glue ---------------
def to_forecast_json(ticker: str, gp: GlobalPredictor) -> Dict[str, Any]:
    L, H = gp.cfg.look_back, gp.cfg.horizon
    logit = gp.predict_logit(ticker)
    calib = ensure_calibrator(ticker, _fit_calibrator_on_demand_factory(gp))
    p_up  = apply_calibrator(logit, calib)

    rows = gp.make_backtest_rows(ticker, days=20) + gp.forecast_series(ticker)
    rows.sort(key=lambda r: r["date"])

    return {
        "ticker": ticker.upper(),
        "look_back": L,
        "context": L,
        "backtest_horizon": H,
        "horizon": H,
        "metrics": {"direction_up_prob": float(p_up)},
        "forecast": rows,
    }

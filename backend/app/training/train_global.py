# app/training/train_global.py
from __future__ import annotations
import os, joblib, numpy as np, pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple
import yfinance as yf
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from app.services.features import build_sequence_features
from app.services.calibrator import save_calibrator
from app.services.global_model import GlobalConfig

LOOK_BACK = int(os.getenv("LOOK_BACK", "90"))
HORIZON   = int(os.getenv("HORIZON", "10"))
YEARS     = int(os.getenv("YEARS", "5"))
CAL_MONTHS= int(os.getenv("CAL_WINDOW_MONTHS", "9"))

UNIVERSE  = os.getenv("TRAIN_UNIVERSE","AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,BRK-B,JPM,V").split(",")

def fetch_ohlcv(ticker: str, years: int = YEARS):
    end = datetime.utcnow()
    start = end - timedelta(days=int(365.25*years))
    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    if df is None or df.empty: return None
    return df[["Close"]].dropna().copy()

def build_samples(df: pd.DataFrame, look_back: int, horizon: int) -> Tuple[np.ndarray, np.ndarray]:
    closes = df["Close"].astype(float).values
    Xs, ys = [], []
    for i in range(look_back, len(closes) - horizon):
        win = closes[i-look_back:i]
        Xs.append(build_sequence_features(win, look_back))
        fut = closes[i+horizon]/closes[i] - 1.0
        ys.append(1 if fut > 0 else 0)
    X = np.stack(Xs); y = np.asarray(ys).astype(int)
    return X, y

def make_model(n_features: int):
    inp = layers.Input(shape=(LOOK_BACK, n_features))
    x = layers.LSTM(96, return_sequences=False)(inp)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(48, activation="relu")(x)
    out = layers.Dense(1)(x)  # raw logit
    model = keras.Model(inp, out)
    model.compile(optimizer=keras.optimizers.Adam(1e-3),
                  loss=keras.losses.BinaryCrossentropy(from_logits=True))
    return model

def train_and_save():
    # Build pooled dataset
    X_all, y_all = [], []
    for t in UNIVERSE:
        df = fetch_ohlcv(t)
        if df is None or len(df) < LOOK_BACK + HORIZON + 100: continue
        X, y = build_samples(df, LOOK_BACK, HORIZON)
        X_all.append(X); y_all.append(y)
    X = np.concatenate(X_all, axis=0)
    y = np.concatenate(y_all, axis=0)

    N, L, F = X.shape
    flat = X.reshape(N*L, F)
    scaler = StandardScaler().fit(flat)
    X_sc = scaler.transform(flat).reshape(N, L, F)

    # CV pick best
    best_w, best_val = None, 1e9
    tscv = TimeSeriesSplit(n_splits=5)
    for tr_idx, va_idx in tscv.split(X_sc):
        m = make_model(F)
        cb = [keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True)]
        hist = m.fit(X_sc[tr_idx], y[tr_idx], validation_data=(X_sc[va_idx], y[va_idx]),
                     epochs=30, batch_size=256, verbose=0, callbacks=cb)
        v = float(min(hist.history["val_loss"]))
        if v < best_val: best_val, best_w = v, m.get_weights()

    final = make_model(F)
    if best_w is not None: final.set_weights(best_w)

    # Save
    cfg = GlobalConfig()
    os.makedirs(os.path.dirname(cfg.model_path), exist_ok=True)
    final.save(cfg.model_path)
    joblib.dump(scaler, cfg.scaler_path)
    print("Saved:", cfg.model_path, cfg.scaler_path)

def fit_calibrators():
    cfg = GlobalConfig()
    model  = keras.models.load_model(cfg.model_path)
    scaler = joblib.load(cfg.scaler_path)

    end = datetime.utcnow()
    start = end - timedelta(days=int(30*CAL_MONTHS))

    for t in UNIVERSE:
        df = yf.download(t, start=start, end=end, progress=False, auto_adjust=True)
        if df is None or df.empty or len(df) < LOOK_BACK + HORIZON + 50: 
            continue
        closes = df["Close"].astype(float).values
        scores, ydir = [], []
        for i in range(LOOK_BACK, len(closes) - HORIZON):
            win = closes[i-LOOK_BACK:i]
            X = build_sequence_features(win, LOOK_BACK)
            X = scaler.transform(X)[np.newaxis, ...]
            s = float(model.predict(X, verbose=0).ravel()[0])
            fut = closes[i+HORIZON]/closes[i] - 1.0
            scores.append(s); ydir.append(1 if fut>0 else 0)
        if len(scores) < 50: continue
        from sklearn.linear_model import LogisticRegression
        lr = LogisticRegression(max_iter=500).fit(np.array(scores).reshape(-1,1), np.array(ydir))
        A = float(lr.coef_.ravel()[0]); B = float(lr.intercept_.ravel()[0])
        save_calibrator(t, A, B)
        print(f"Cal {t}: A={A:.3f} B={B:.3f}")

if __name__ == "__main__":
    train_and_save()
    fit_calibrators()

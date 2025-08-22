# app/services/backtest.py
from __future__ import annotations

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_percentage_error
import tensorflow as tf

# -------------------------------
# Data + feature engineering
# -------------------------------

def fetch_prices(ticker: str, start="2016-01-01", end=None, interval="1d") -> pd.DataFrame:
    df = yf.download(ticker, start=start, end=end, interval=interval, auto_adjust=True, progress=False)
    if df.empty:
        raise ValueError("No data returned. Check ticker/interval or your network.")
    df.index.name = "Date"
    return df[["Open", "High", "Low", "Close", "Volume"]].dropna()

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    close = pd.to_numeric(out["Close"].squeeze(), errors="coerce")
    close = close.where(close > 0, np.nan)
    out["Close"] = close

    # base returns
    out["log_ret"] = np.log(close).diff()
    out["ret"] = close.pct_change()

    # rolling stats
    out["roll_mean_7"] = close.rolling(7).mean()
    out["roll_std_7"] = close.rolling(7).std()
    out["roll_mean_21"] = close.rolling(21).mean()
    out["roll_std_21"] = close.rolling(21).std()

    # RSI(14)
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    roll_up = up.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    roll_dn = down.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    rs = roll_up / roll_dn.replace(0, np.nan)
    out["rsi_14"] = 100 - (100 / (1 + rs))

    # MACD (12,26,9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    out["macd"] = macd
    out["macd_signal"] = macd.ewm(span=9, adjust=False).mean()
    out["macd_diff"] = out["macd"] - out["macd_signal"]

    # Bollinger width (20,2)
    ma20 = close.rolling(20).mean()
    sd20 = close.rolling(20).std()
    out["bb_width"] = (ma20 + 2 * sd20 - (ma20 - 2 * sd20)) / close

    # lags & volatility
    out["ret_lag1"] = out["log_ret"].shift(1)
    out["ret_lag3"] = out["log_ret"].shift(3)
    out["ret_lag5"] = out["log_ret"].shift(5)
    out["vol_7"] = out["log_ret"].rolling(7).std()
    out["vol_21"] = out["log_ret"].rolling(21).std()
    out["z_close_21"] = (close - close.rolling(21).mean()) / close.rolling(21).std()

    return out.dropna()

FEATURES = [
    "Close","Volume","log_ret","ret",
    "roll_mean_7","roll_std_7","roll_mean_21","roll_std_21",
    "rsi_14","macd","macd_signal","macd_diff",
    "bb_width","ret_lag1","ret_lag3","ret_lag5",
    "vol_7","vol_21","z_close_21",
]

def make_windows(X: np.ndarray, y: np.ndarray, lookback: int, horizon: int):
    xs, ys = [], []
    for i in range(lookback, len(X) - horizon + 1):
        xs.append(X[i - lookback : i, :])
        ys.append(y[i : i + horizon])
    return np.array(xs, dtype="float32"), np.array(ys, dtype="float32")

def build_model(input_steps: int, n_features: int, horizon: int) -> tf.keras.Model:
    inp = tf.keras.Input(shape=(input_steps, n_features))
    x = tf.keras.layers.Conv1D(48, kernel_size=5, padding="causal", activation="relu")(inp)
    x = tf.keras.layers.Dropout(0.2)(x)
    x = tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(160, return_sequences=True))(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.LSTM(96)(x)
    out = tf.keras.layers.Dense(horizon)(x)
    model = tf.keras.Model(inp, out)
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss="mse")
    return model

# -------------------------------
# Sliding-window LSTM backtest (legacy)
# -------------------------------

def run_backtest(ticker: str, look_back: int, horizon: int, start_date: str, end_date: str | None = None):
    raw = fetch_prices(ticker, start=start_date, end=end_date)
    df = add_features(raw)
    df["target_ret"] = df["log_ret"].shift(-1)
    df = df.dropna()

    X_df = df[FEATURES].astype("float32")
    y = df["target_ret"].astype("float32").values
    dates = df.index

    results: list[dict] = []
    preds: list[float] = []
    actuals: list[float] = []
    strategy_returns: list[float] = []

    max_windows = 50
    start_idx = look_back
    # safer guard
    while (start_idx + horizon) <= len(df) and (len(results) // max(1, horizon)) < max_windows:
        train_X_df = X_df.iloc[:start_idx]
        train_y = y[:start_idx]

        scaler_X = StandardScaler()
        X_train = scaler_X.fit_transform(train_X_df.values)
        scaler_y = StandardScaler()
        y_train_s = scaler_y.fit_transform(train_y.reshape(-1, 1)).ravel()

        X_train_w, y_train_w = make_windows(X_train, y_train_s, look_back, horizon)
        if len(X_train_w) == 0:
            break
        model = build_model(look_back, X_train_w.shape[2], horizon)
        cbs = [tf.keras.callbacks.EarlyStopping(monitor="loss", patience=5, restore_best_weights=True)]
        model.fit(X_train_w, y_train_w, epochs=20, batch_size=32, verbose=0, callbacks=cbs)

        last_block_raw = train_X_df.values[-look_back:]
        last_block = scaler_X.transform(last_block_raw).reshape(1, look_back, X_train_w.shape[2])
        next_ret_s = model.predict(last_block, verbose=0)[0]
        next_ret = scaler_y.inverse_transform(next_ret_s.reshape(-1, 1)).ravel()

        last_price = df["Close"].iloc[start_idx - 1]
        pred_prices = last_price * np.exp(np.cumsum(next_ret))
        actual_prices = df["Close"].iloc[start_idx : start_idx + horizon].values

        prev_price = last_price
        for j in range(min(horizon, len(actual_prices))):
            date = dates[start_idx + j].strftime("%Y-%m-%d")
            pred_price = float(pred_prices[j])
            actual_price = float(actual_prices[j])
            results.append({"date": date, "pred": pred_price, "actual": actual_price})
            preds.append(pred_price)
            actuals.append(actual_price)
            if j == 0:
                actual_return = (actual_price - prev_price) / prev_price
                pred_return = (pred_price - prev_price) / prev_price
                strategy_returns.append(np.sign(pred_return) * actual_return)
        start_idx += horizon

    if not results:
        raise ValueError("Not enough data for backtest")

    y_true = np.array(actuals)
    y_pred = np.array(preds)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mape = float(mean_absolute_percentage_error(y_true, y_pred) * 100)
    if strategy_returns:
        sr_arr = np.array(strategy_returns)
        sharpe = float(sr_arr.mean() / (sr_arr.std() + 1e-8) * np.sqrt(252))
        cumulative_return = float(np.prod(1 + sr_arr) - 1)
    else:
        sharpe = 0.0
        cumulative_return = 0.0

    return {
        "ticker": ticker.upper(),
        "look_back": look_back,
        "horizon": horizon,
        "metrics": {
            "rmse": rmse,
            "mape": mape,
            "sharpe": sharpe,
            "cumulative_return": cumulative_return,
        },
        "results": results,
    }

# -------------------------------
# Strategy backtester (job flow)
# -------------------------------

def simulate_backtest(payload, progress_cb=None):
    """No imports from app.schemas here to avoid circular imports; payload has attributes used below."""
    ticker = payload.ticker.upper()
    period = payload.range
    interval = payload.interval
    strat = payload.strategy
    cash = float(payload.initial_cash)
    slippage = float(payload.costs.slippage_bps) / 10000.0
    commission = float(payload.costs.commission_per_trade)

    df = yf.download(ticker, period=period, interval=interval, auto_adjust=True, progress=False)
    if df.empty:
        raise ValueError("No data returned")
    prices = df["Close"].dropna()

    # signals
    signal = pd.Series(0, index=prices.index)
    if strat.type == "buy_hold":
        signal.iloc[0:] = 1
    elif strat.type == "sma_crossover":
        fast = strat.params.get("fast", 20)
        slow = strat.params.get("slow", 50)
        sma_fast = prices.rolling(fast).mean()
        sma_slow = prices.rolling(slow).mean()
        signal = (sma_fast > sma_slow).astype(int)
        signal = signal.fillna(0)
    elif strat.type == "rsi":
        period_r = strat.params.get("period", 14)
        buy = strat.params.get("buy", 30)
        sell = strat.params.get("sell", 70)
        delta = prices.diff()
        gain = delta.clip(lower=0).rolling(period_r).mean()
        loss = -delta.clip(upper=0).rolling(period_r).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        sig = pd.Series(np.nan, index=prices.index)
        sig[rsi < buy] = 1
        sig[rsi > sell] = 0
        signal = sig.ffill().fillna(0)

    position = 0
    shares = 0
    equity = []
    drawdown = []
    trades = []
    trade_rets = []
    exposure_days = 0
    peak = cash
    entry_price = None

    for i, (date, price) in enumerate(prices.items()):
        desired = signal.iat[i]
        if desired == 1 and position == 0:
            qty = cash // price
            if qty > 0:
                cost = qty * price * (1 + slippage) + commission
                cash -= cost
                shares += qty
                position = 1
                entry_price = price * (1 + slippage)
                trades.append({"t": date.strftime("%Y-%m-%d"), "side": "buy", "price": float(price), "qty": int(qty)})
        elif desired == 0 and position == 1:
            revenue = shares * price * (1 - slippage) - commission
            cash += revenue
            pnl_pct = (price * (1 - slippage) - entry_price) / entry_price if entry_price else 0
            trade_rets.append(pnl_pct)
            trades.append({"t": date.strftime("%Y-%m-%d"), "side": "sell", "price": float(price), "qty": int(shares), "pnl": float(pnl_pct)})
            shares = 0
            position = 0
            entry_price = None

        if position == 1:
            exposure_days += 1
        value = cash + shares * price
        equity.append({"t": date.strftime("%Y-%m-%d"), "value": float(value)})
        peak = max(peak, value)
        dd = (value - peak) / peak
        drawdown.append({"t": date.strftime("%Y-%m-%d"), "dd": float(dd)})
        if progress_cb:
            progress_cb((i + 1) / len(prices) * 100)

    # close any open position at last price
    if position == 1 and shares > 0:
        price = prices.iloc[-1]
        revenue = shares * price * (1 - slippage) - commission
        cash += revenue
        pnl_pct = (price * (1 - slippage) - entry_price) / entry_price if entry_price else 0
        trade_rets.append(pnl_pct)
        trades.append({"t": prices.index[-1].strftime("%Y-%m-%d"), "side": "sell", "price": float(price), "qty": int(shares), "pnl": float(pnl_pct)})
        shares = 0
        position = 0
    value = cash
    equity[-1]["value"] = float(value)

    eq_df = pd.DataFrame(equity).set_index("t")
    eq_df.index = pd.to_datetime(eq_df.index)
    daily_ret = eq_df["value"].pct_change().fillna(0)
    start_val = float(eq_df["value"].iloc[0])
    end_val = float(eq_df["value"].iloc[-1])
    return_pct = (end_val - start_val) / start_val * 100
    years = (eq_df.index[-1] - eq_df.index[0]).days / 365.25
    cagr = (end_val / start_val) ** (1 / years) - 1 if years > 0 else 0
    vol = float(daily_ret.std() * np.sqrt(252))
    sharpe = float(daily_ret.mean() / (daily_ret.std() + 1e-8) * np.sqrt(252))
    neg = daily_ret[daily_ret < 0]
    sortino = float(daily_ret.mean() / (neg.std() + 1e-8) * np.sqrt(252))
    dd_min = float(min(d["dd"] for d in drawdown)) if drawdown else 0
    win_trades = [r for r in trade_rets if r > 0]
    loss_trades = [r for r in trade_rets if r <= 0]
    win_rate = len(win_trades) / len(trade_rets) if trade_rets else 0
    avg_win = float(np.mean(win_trades)) if win_trades else 0
    avg_loss = float(np.mean(loss_trades)) if loss_trades else 0
    num_trades = len(trade_rets)
    exposure_pct = exposure_days / len(prices) if len(prices) else 0

    monthly = eq_df["value"].resample("M").last().pct_change().dropna()
    bar_returns = [{"t": d.strftime("%Y-%m"), "ret": float(r)} for d, r in monthly.items()]

    metrics = {
        "startValue": start_val, "endValue": end_val, "returnPct": return_pct, "cagr": float(cagr),
        "sharpe": sharpe, "sortino": sortino, "volatility": vol, "maxDrawdownPct": dd_min,
        "winRate": float(win_rate), "avgWin": avg_win, "avgLoss": avg_loss,
        "numTrades": num_trades, "exposurePct": float(exposure_pct),
    }

    return {
        "ticker": ticker,
        "equity": equity,
        "drawdown": drawdown,
        "trades": trades,
        "barReturns": bar_returns,
        "metrics": metrics,
    }

# -------------------------------
# Simple 90→10 “accuracy” backtest
# -------------------------------

def run_backtest_last(ticker: str, look_back: int = 90, horizon: int = 10):
    # 1) Overfetch plenty of calendar days; yfinance will drop non-trading days for equities
    start_date = (datetime.utcnow() - timedelta(days=look_back + horizon + 320)).strftime("%Y-%m-%d")
    raw = fetch_prices(ticker, start=start_date, end=None)
    df = add_features(raw)
    df["target_ret"] = df["log_ret"].shift(-1)
    df = df.dropna()

    # 2) Must have at least look_back + 2 rows (one to predict from, at least one to evaluate)
    min_needed = max(look_back + 2, horizon + 2)
    if len(df) < min_needed:
        raise ValueError(f"Not enough data: need ≥{min_needed} rows, got {len(df)}")

    # 3) Train on everything up to the last H rows (but cap H to available rows)
    #    If there are fewer than 'horizon' rows at the end, shrink horizon to fit.
    max_h = min(horizon, len(df) - look_back - 1)
    if max_h < 1:
        # fallback: train on all but last row, predict 1
        max_h = 1
    horizon = int(max_h)

    start_idx = len(df) - horizon  # first evaluation index
    X_df = df[FEATURES].astype("float32")
    y = df["target_ret"].astype("float32").values
    dates = df.index

    # 4) Ensure the training block has at least 'look_back' rows; if not, shrink look_back.
    if start_idx < look_back:
        look_back = int(max(2, start_idx))
    train_X_df = X_df.iloc[:start_idx]
    train_y = y[:start_idx]

    scaler_X = StandardScaler().fit(train_X_df.values)
    scaler_y = StandardScaler().fit(train_y.reshape(-1, 1))

    X_train = scaler_X.transform(train_X_df.values)
    y_train_s = scaler_y.transform(train_y.reshape(-1, 1)).ravel()

    X_train_w, y_train_w = make_windows(X_train, y_train_s, look_back, horizon)
    if len(X_train_w) == 0:
        raise ValueError("Not enough windows for training after safety caps")

    model = build_model(look_back, X_train_w.shape[2], horizon)
    cbs = [tf.keras.callbacks.EarlyStopping(monitor="loss", patience=6, restore_best_weights=True)]
    model.fit(X_train_w, y_train_w, epochs=24, batch_size=32, verbose=0, callbacks=cbs)

    # 5) Predict from the last look_back training rows
    last_block_raw = train_X_df.values[-look_back:]
    last_block = scaler_X.transform(last_block_raw).reshape(1, look_back, X_train_w.shape[2])
    next_ret_s = model.predict(last_block, verbose=0)[0]                # shape (horizon,)
    next_ret = scaler_y.inverse_transform(next_ret_s.reshape(-1, 1)).ravel()

    last_price = float(df["Close"].iloc[start_idx - 1])
    # 6) Ensure pred length == actual length by explicit capping
    actual_prices = df["Close"].iloc[start_idx : start_idx + horizon].values.astype("float64")
    horizon = int(min(horizon, len(actual_prices)))
    next_ret = next_ret[:horizon]

    pred_prices = last_price * np.exp(np.cumsum(next_ret))              # shape (horizon,)

    # 7) Build results (length-safe)
    results = []
    preds, actuals, strategy_returns = [], [], []
    prev_price = last_price
    for j in range(horizon):
        date = dates[start_idx + j].strftime("%Y-%m-%d")
        pred_price = float(pred_prices[j])
        actual_price = float(actual_prices[j])
        results.append({"date": date, "pred": pred_price, "actual": actual_price})
        preds.append(pred_price)
        actuals.append(actual_price)
        if j == 0:
            actual_return = (actual_price - prev_price) / (prev_price or 1.0)
            pred_return = (pred_price - prev_price) / (prev_price or 1.0)
            strategy_returns.append(np.sign(pred_return) * actual_return)

    # 8) Metrics on the evaluation window
    y_true = np.array(actuals, dtype="float64")
    y_pred = np.array(preds, dtype="float64")
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mape = float(mean_absolute_percentage_error(y_true, y_pred) * 100.0)
    if strategy_returns:
        sr = np.array(strategy_returns, dtype="float64")
        sharpe = float(sr.mean() / (sr.std() + 1e-8) * np.sqrt(252))
        cumulative_return = float(np.prod(1 + sr) - 1)
    else:
        sharpe = 0.0
        cumulative_return = 0.0

    return {
        "ticker": ticker.upper(),
        "look_back": int(look_back),
        "horizon": int(horizon),
        "metrics": {
            "rmse": rmse,
            "mape": mape,
            "sharpe": sharpe,
            "cumulative_return": cumulative_return,
        },
        "results": results,
    }

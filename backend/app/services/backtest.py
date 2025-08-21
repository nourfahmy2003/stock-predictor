import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_percentage_error
import tensorflow as tf

# --- helpers copied from notebook ---

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
    "Close",
    "Volume",
    "log_ret",
    "ret",
    "roll_mean_7",
    "roll_std_7",
    "roll_mean_21",
    "roll_std_21",
    "rsi_14",
    "macd",
    "macd_signal",
    "macd_diff",
    "bb_width",
    "ret_lag1",
    "ret_lag3",
    "ret_lag5",
    "vol_7",
    "vol_21",
    "z_close_21",
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
    while start_idx + horizon <= len(df) and len(results) / horizon < max_windows:
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
        cbs = [
            tf.keras.callbacks.EarlyStopping(monitor="loss", patience=5, restore_best_weights=True)
        ]
        model.fit(
            X_train_w,
            y_train_w,
            epochs=20,
            batch_size=32,
            verbose=0,
            callbacks=cbs,
        )

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

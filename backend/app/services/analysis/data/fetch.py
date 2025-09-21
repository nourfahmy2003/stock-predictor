from datetime import date, datetime, time, timedelta
from typing import Dict, Optional
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import pandas_market_calendars as mcal
import yfinance as yf

NY_TZ = ZoneInfo("America/New_York")
SESSION_WINDOWS = {
    "premarket": (time(4, 0), time(9, 30)),
    "regular": (time(9, 30), time(16, 0)),
    "postmarket": (time(16, 0), time(20, 0)),
}
BASE_COLUMNS = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]


def fetch_stock_data(ticker: str, interval: str = "5m", include_prepost: bool = False) -> pd.DataFrame:
    period_map = {
        "1m": "5d",
        "2m": "10d",
        "5m": "15d",
        "15m": "30d",
        "30m": "45d",
        "60m": "60d",
    }

    period = period_map.get(interval)
    if not period:
        raise ValueError(f"Unsupported interval: {interval}")

    df = yf.Ticker(ticker.upper()).history(interval=interval, period=period, prepost=include_prepost)
    if df.empty:
        raise ValueError(f"No data found for {ticker} at {interval}/{period}")
    df.drop(columns=["Dividends", "Stock Splits"], inplace=True, errors="ignore")
    return df


def get_daily_pivots(ticker: str, include_prepost: bool = False) -> dict:
    df = yf.Ticker(ticker.upper()).history(interval="1d", period="5d", prepost=include_prepost)
    if df.empty or len(df) < 2:
        raise ValueError(f"Not enough daily data for {ticker}")
    yesterday = df.iloc[-2]
    return {
        "high": float(yesterday["High"]),
        "low": float(yesterday["Low"]),
        "close": float(yesterday["Close"]),
    }


def _ensure_timezone(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    if df.index.tz is None:
        df.index = df.index.tz_localize("UTC")
    df.index = df.index.tz_convert(NY_TZ)
    return df


def _resolve_trading_session(target: date) -> pd.Timestamp:
    calendar = mcal.get_calendar("NYSE")
    target_ts = pd.Timestamp(target)
    start_lookup = target_ts - pd.Timedelta(days=10)
    schedule = calendar.schedule(start_date=start_lookup, end_date=target_ts + pd.Timedelta(days=1))
    if schedule.empty:
        raise ValueError("Unable to locate a valid NYSE session in lookup window")

    eligible = schedule.index[schedule.index <= target_ts]
    if len(eligible) == 0:
        session_day = schedule.index[0]
    else:
        session_day = eligible[-1]
    return pd.Timestamp(session_day).tz_localize(None)


def _session_windows_for(session_date: pd.Timestamp) -> Dict[str, pd.Timestamp]:
    base = pd.Timestamp(session_date, tz=NY_TZ)
    windows = {}
    for key, (start_t, end_t) in SESSION_WINDOWS.items():
        start_ts = base + pd.Timedelta(hours=start_t.hour, minutes=start_t.minute)
        end_ts = base + pd.Timedelta(hours=end_t.hour, minutes=end_t.minute)
        windows[f"{key}_start"] = start_ts
        windows[f"{key}_end"] = end_ts
    return windows


def fetch_intraday_sessions(
    ticker: str,
    session_date: Optional[date] = None,
    interval: str = "5m",
) -> Dict[str, pd.DataFrame]:
    """Fetch intraday data segmented into premarket, regular, and postmarket sessions."""

    if session_date is None:
        session_date = datetime.now(NY_TZ).date()
    else:
        session_date = pd.Timestamp(session_date).date()

    trading_day = _resolve_trading_session(session_date)
    windows = _session_windows_for(trading_day)

    start_utc = windows["premarket_start"].tz_convert("UTC")
    end_utc = windows["postmarket_end"].tz_convert("UTC")

    history = yf.Ticker(ticker.upper()).history(
        start=start_utc.to_pydatetime(),
        end=end_utc.to_pydatetime(),
        interval=interval,
        prepost=True,
    )

    if history.empty:
        empty_frames = {name: pd.DataFrame(columns=BASE_COLUMNS) for name in ["premarket", "regular", "postmarket", "all"]}
        empty_frames["all"] = empty_frames["all"].assign(session=pd.Series(dtype="object"))
        return empty_frames

    history.drop(columns=["Dividends", "Stock Splits"], inplace=True, errors="ignore")
    history = _ensure_timezone(history).sort_index()

    idx = history.index
    pre_start, pre_end = windows["premarket_start"], windows["premarket_end"]
    reg_start, reg_end = windows["regular_start"], windows["regular_end"]
    post_start, post_end = windows["postmarket_start"], windows["postmarket_end"]

    pre_mask = (idx >= pre_start) & (idx < reg_start)
    reg_mask = (idx >= reg_start) & (idx < reg_end)
    post_mask = (idx >= post_start) & (idx < post_end)

    valid_mask = pre_mask | reg_mask | post_mask
    combined = history.loc[valid_mask].copy()
    if combined.empty:
        empty_frames = {name: pd.DataFrame(columns=BASE_COLUMNS) for name in ["premarket", "regular", "postmarket", "all"]}
        empty_frames["all"] = empty_frames["all"].assign(session=pd.Series(dtype="object"))
        return empty_frames

    combined_idx = combined.index
    pre_mask_combined = (combined_idx >= pre_start) & (combined_idx < reg_start)
    reg_mask_combined = (combined_idx >= reg_start) & (combined_idx < reg_end)
    post_mask_combined = (combined_idx >= post_start) & (combined_idx < post_end)

    combined["session"] = np.select(
        [pre_mask_combined, reg_mask_combined, post_mask_combined],
        ["premarket", "regular", "postmarket"],
        default="out_of_session",
    )

    base_cols = [col for col in combined.columns if col != "session"]
    sessions = {
        "premarket": combined.loc[combined["session"] == "premarket", base_cols],
        "regular": combined.loc[combined["session"] == "regular", base_cols],
        "postmarket": combined.loc[combined["session"] == "postmarket", base_cols],
        "all": combined,
    }

    return sessions


def fetch_stock_data_with_sessions(
    ticker: str,
    session_date: Optional[date] = None,
    interval: str = "5m",
) -> pd.DataFrame:
    """Convenience wrapper returning the combined intraday DataFrame with session labels."""

    return fetch_intraday_sessions(ticker, session_date, interval)["all"]

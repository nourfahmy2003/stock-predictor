
from functools import lru_cache
from datetime import timedelta
import time
import yfinance as yf
import pandas as pd

def fetch_stock_data(ticker: str, interval: str = "5m") -> pd.DataFrame:
    period_map = {
        "1m": "5d",     
        "2m": "10d",
        "5m": "15d",
        "15m": "30d",
        "30m": "45d",
        "60m": "60d",
    }

    # normalize: pick the right period based on interval
    period = period_map.get(interval)
    if not period:
        raise ValueError(f"Unsupported interval: {interval}")

    df = yf.Ticker(ticker.upper()).history(interval=interval, period=period)
    if df.empty:
        raise ValueError(f"No data found for {ticker} at {interval}/{period}")
    df.drop(columns=["Dividends", "Stock Splits"], inplace=True, errors='ignore')
    return df

def get_daily_pivots(ticker: str) -> dict:
    df = yf.Ticker(ticker.upper()).history(interval="1d", period="5d")  
    # grab the last 5 daily candles (safe buffer)

    if df.empty or len(df) < 2:
        raise ValueError(f"Not enough daily data for {ticker}")

    # yesterday = second-to-last row
    yesterday = df.iloc[-2]  

    return {
        "high": float(yesterday["High"]),
        "low": float(yesterday["Low"]),
        "close": float(yesterday["Close"]),
    }
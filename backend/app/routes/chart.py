import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


@router.get("/chart/{ticker}")
def chart(ticker: str, range: str = Query("1y"), interval: str = Query("1d")):
    try:
        period_map = {
            "1d": "1d","5d": "5d","1mo": "1mo","3mo": "3mo","6mo": "6mo",
            "1y": "1y","2y": "2y","5y": "5y","10y": "10y","ytd": "ytd","max": "max",
        }
        period = period_map.get(range, "1y")
        df = yf.Ticker(ticker.upper()).history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail="No chart data")
        out = [
            {
                "date": i.isoformat(),
                "open": float(r["Open"]), "high": float(r["High"]),
                "low": float(r["Low"]),  "close": float(r["Close"]),
                "volume": int(r["Volume"]),
            }
            for i, r in df.iterrows()
        ]
        return {"ticker": ticker.upper(), "range": range, "interval": interval, "series": out}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

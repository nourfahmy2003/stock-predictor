import yfinance as yf
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/overview/{ticker}")
def overview(ticker: str):
    try:
        t = yf.Ticker(ticker.upper())
        fi = getattr(t, "fast_info", {}) or {}
        price = fi.get("last_price") or fi.get("last_close") or fi.get("regular_market_price")
        prev = fi.get("previous_close") or fi.get("last_close")
        day_low = fi.get("day_low")
        day_high = fi.get("day_high")
        volume = fi.get("last_volume") or fi.get("regular_market_volume")
        market_cap = fi.get("market_cap")
        currency = fi.get("currency") or "USD"
        pe_ratio = None

        if not price or price == 0:
            hist = t.history(period="2d", interval="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                if len(hist) > 1:
                    prev = float(hist["Close"].iloc[-2])

        if day_low is None or day_high is None:
            intraday = t.history(period="1d", interval="1m")
            if not intraday.empty:
                day_low = float(intraday["Low"].min())
                day_high = float(intraday["High"].max())

        try:
            info = t.info or {}
            pe_ratio = info.get("trailingPE", pe_ratio)
            market_cap = market_cap or info.get("marketCap")
        except Exception:
            pass

        change = None
        change_pct = None
        if price is not None and prev is not None:
            change = float(price) - float(prev)
            if prev:
                change_pct = change / float(prev)

        return {
            "ticker": ticker.upper(),
            "price": float(price or 0),
            "change": change,
            "changePercent": change_pct,
            "volume": int(volume) if volume is not None else None,
            "peRatio": float(pe_ratio) if pe_ratio is not None else None,
            "marketCap": int(market_cap) if market_cap is not None else None,
            "dayRange": {
                "low": float(day_low) if day_low is not None else None,
                "high": float(day_high) if day_high is not None else None,
            },
            "currency": currency,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

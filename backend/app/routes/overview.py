from datetime import datetime, time, timedelta, timezone
from typing import List, Optional

import pandas as pd
import pandas_market_calendars as mcal
import yfinance as yf
from fastapi import APIRouter, HTTPException
from zoneinfo import ZoneInfo

from app.services.analysis.data.fetch import fetch_stock_data

router = APIRouter()

NY_TZ = ZoneInfo("America/New_York")
NYSE_CAL = mcal.get_calendar("NYSE")
PREMARKET_START = time(4, 0)
POSTMARKET_END = time(20, 0)


def _is_crypto_asset(ticker: str, quote_type: str) -> bool:
    lower = (quote_type or "").lower()
    ticker_lower = ticker.lower()
    if "crypto" in lower or "digital" in lower:
        return True
    if ticker_lower.endswith("-usd") or ticker_lower.startswith("crypto"):
        return True
    return False


def _regular_session_window(now: datetime):
    start_date = now.date() - timedelta(days=5)
    end_date = now.date() + timedelta(days=5)
    schedule = NYSE_CAL.schedule(start_date=start_date, end_date=end_date)
    if schedule.empty:
        return False, None, None
    day_key = pd.Timestamp(now.date())
    if day_key not in schedule.index:
        return False, None, None
    session = schedule.loc[day_key]
    open_time = session["market_open"].tz_convert(NY_TZ)
    close_time = session["market_close"].tz_convert(NY_TZ)
    is_open = open_time <= now <= close_time
    return is_open, open_time, close_time


def _find_next_regular_open(now: datetime) -> Optional[datetime]:
    schedule = NYSE_CAL.schedule(start_date=now.date(), end_date=now.date() + timedelta(days=10))
    if schedule.empty:
        return None
    for _, row in schedule.iterrows():
        open_time = row["market_open"].tz_convert(NY_TZ)
        if open_time > now:
            return open_time
    return None


def _iso_date(value: Optional[float]) -> Optional[str]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date().isoformat()
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc).date().isoformat()
    except Exception:
        return None


def _determine_dividend_frequency(dividends: pd.Series) -> Optional[str]:
    if dividends is None or dividends.empty:
        return None
    if len(dividends) < 3:
        return None
    diffs = dividends.index.to_series().diff().dropna()
    if diffs.empty:
        return None
    avg_days = diffs.dt.days.mean()
    if avg_days < 40:
        return "Monthly"
    if avg_days < 80:
        return "Quarterly"
    if avg_days < 170:
        return "Semi-Annual"
    return "Annual"


def _build_performance(history: pd.DataFrame) -> List[dict]:
    if history.empty:
        return []
    closes = history["Close"].dropna()
    if closes.empty:
        return []
    idx = closes.index

    result: List[dict] = []

    def add_interval(label: str, trading_days: Optional[int] = None, since: Optional[datetime] = None):
        if trading_days is not None:
            if len(closes) <= trading_days:
                return
            start_price = float(closes.iloc[-trading_days - 1])
            end_price = float(closes.iloc[-1])
            start_date = idx[-trading_days - 1].date().isoformat()
            end_date = idx[-1].date().isoformat()
        else:
            mask = idx >= since
            filtered = closes[mask]
            if filtered.empty:
                return
            start_price = float(filtered.iloc[0])
            end_price = float(closes.iloc[-1])
            start_date = filtered.index[0].date().isoformat()
            end_date = idx[-1].date().isoformat()

        percent = None if start_price == 0 else (end_price - start_price) / start_price
        result.append(
            {
                "label": label,
                "start": start_price,
                "end": end_price,
                "absolute": end_price - start_price,
                "percent": percent,
                "startDate": start_date,
                "endDate": end_date,
            }
        )

    add_interval("1D", trading_days=1)
    add_interval("5D", trading_days=5)
    add_interval("1M", trading_days=21)
    add_interval("3M", trading_days=63)
    add_interval("6M", trading_days=126)

    year_start = datetime.now(timezone.utc).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    add_interval("YTD", since=year_start)

    trading_days_one_year = min(252, len(closes) - 1)
    if trading_days_one_year > 0:
        add_interval("1Y", trading_days=trading_days_one_year)

    return result


@router.get("/overview/{ticker}")
def overview(ticker: str):
    try:
        ticker = ticker.upper()
        yt = yf.Ticker(ticker)
        fi = getattr(yt, "fast_info", {}) or {}

        prev_close = fi.get("previous_close") or fi.get("last_close")
        regular_market_price = fi.get("regular_market_price")
        last_trade_price = fi.get("last_price")
        price = last_trade_price or regular_market_price or prev_close
        day_low = fi.get("day_low")
        day_high = fi.get("day_high")
        open_price = fi.get("open")
        volume = fi.get("last_volume") or fi.get("regular_market_volume")
        market_cap = fi.get("market_cap")
        currency = fi.get("currency") or "USD"
        week52_low = fi.get("year_low")
        week52_high = fi.get("year_high")

        avg_volume = None
        avg_volume_label = None
        avg_candidates = [
            ("65-day", fi.get("sixty_day_average_volume") or fi.get("sixty_day_avg_volume")),
            ("30-day", fi.get("thirty_day_average_volume")),
            ("20-day", fi.get("twenty_day_average_volume")),
            ("10-day", fi.get("ten_day_average_volume") or fi.get("ten_day_avg_volume")),
            ("3-month", fi.get("three_month_average_volume")),
        ]
        for label, value in avg_candidates:
            if value:
                avg_volume = float(value)
                avg_volume_label = label
                break

        if not price or price == 0:
            hist = yt.history(period="2d", interval="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                if len(hist) > 1:
                    prev_close = float(hist["Close"].iloc[-2])

        if open_price is None:
            try:
                open_hist = yt.history(period="1d", interval="1m")
                if not open_hist.empty:
                    open_price = float(open_hist["Open"].iloc[0])
            except Exception:
                open_price = None

        if day_low is None or day_high is None or avg_volume is None or volume is None:
            try:
                intraday = yt.history(period="1d", interval="1m")
            except Exception:
                intraday = pd.DataFrame()
            if not intraday.empty:
                if day_low is None:
                    day_low = float(intraday["Low"].min())
                if day_high is None:
                    day_high = float(intraday["High"].max())
                if volume is None:
                    try:
                        volume = float(intraday["Volume"].sum())
                    except Exception:
                        volume = None
                if avg_volume is None:
                    avg_volume = float(intraday["Volume"].mean())
                    avg_volume_label = avg_volume_label or "intraday"

        pe_ratio = shares_out = float_shares = beta = eps = None
        dividend_rate = dividend_yield_ratio = None
        ex_dividend_ts = next_dividend_ts = last_dividend_ts = None
        next_dividend_pay_ts = None

        try:
            info = yt.info or {}
        except Exception:
            info = {}

        if info:
            pe_ratio = info.get("trailingPE")
            market_cap = market_cap or info.get("marketCap")
            week52_low = week52_low or info.get("fiftyTwoWeekLow")
            week52_high = week52_high or info.get("fiftyTwoWeekHigh")
            if avg_volume is None:
                if info.get("averageDailyVolume10Day"):
                    avg_volume = float(info["averageDailyVolume10Day"])
                    avg_volume_label = "10-day"
                elif info.get("averageVolume"):
                    avg_volume = float(info["averageVolume"])
                    avg_volume_label = "3-month"
            shares_out = info.get("sharesOutstanding")
            float_shares = info.get("floatShares") or info.get("float_shares")
            beta = info.get("beta")
            eps = info.get("trailingEps") or info.get("epsTrailingTwelveMonths")
            dividend_rate = info.get("dividendRate")
            dividend_yield_ratio = info.get("dividendYield")
            ex_dividend_ts = info.get("exDividendDate")
            next_dividend_ts = info.get("nextDividendDate")
            last_dividend_ts = info.get("lastDividendDate")
            next_dividend_pay_ts = info.get("nextDividendDate")

        dividends = None
        try:
            dividends = yt.dividends
        except Exception:
            dividends = None

        ttm_dividend = None
        last_dividend_amount = None
        last_dividend_date = None
        dividend_frequency = None

        if dividends is not None and not dividends.empty:
            dividends = dividends.sort_index()
            last_dividend_amount = float(dividends.iloc[-1])
            last_dividend_date = dividends.index[-1].date().isoformat()
            one_year_ago = dividends.index[-1] - timedelta(days=365)
            ttm_slice = dividends[dividends.index >= one_year_ago]
            if not ttm_slice.empty:
                ttm_dividend = float(ttm_slice.sum())
            dividend_frequency = _determine_dividend_frequency(dividends)

        quote_type = fi.get("quote_type") or fi.get("quoteType") or (info.get("quoteType") if info else "")
        is_crypto_asset = _is_crypto_asset(ticker, quote_type)
        now_ny = datetime.now(NY_TZ)
        if is_crypto_asset:
            market_open_flag = True
            session_open = session_close = None
        else:
            market_open_flag, session_open, session_close = _regular_session_window(now_ny)

        market_open = market_open_flag if not is_crypto_asset else True

        market_state = (fi.get("market_state") or "").upper()
        is_pre_market_state = market_state.startswith("PRE")
        is_after_hours_state = market_state.startswith("POST") or market_state.startswith("AFTER")
        is_closed_state = market_state.startswith("CLOSE") or market_state.startswith("HALT")

        pre_market_price = fi.get("pre_market_price")
        post_market_price = fi.get("post_market_price")

        analysis_price = None
        analysis_prev_close = None
        try:
            analysis_history = fetch_stock_data(ticker, "5m", include_prepost=True)
            if analysis_history is not None and not analysis_history.empty:
                analysis_price = float(analysis_history["Close"].iloc[-1])
                if len(analysis_history) > 1:
                    analysis_prev_close = float(analysis_history["Close"].iloc[-2])
        except Exception:
            analysis_history = None

        def _first_price(*values):
            for val in values:
                if val is not None and val != 0:
                    try:
                        return float(val)
                    except (TypeError, ValueError):
                        continue
            return None

        if is_crypto_asset:
            price_session = "continuous"
            display_price = _first_price(analysis_price, price, regular_market_price, prev_close)
            is_pre_market = False
            is_after_hours = False
            market_open = True
            if display_price is None:
                display_price = float(prev_close or price or 0)
        else:
            display_price = None
            price_session = "regular"
            is_pre_market = False
            is_after_hours = False

            post_end = (
                datetime.combine(session_close.date(), POSTMARKET_END, tzinfo=NY_TZ)
                if session_close is not None
                else None
            )

            pre_window = (
                session_open
                and now_ny < session_open
                and now_ny.time() >= PREMARKET_START
            )
            post_window = (
                session_close
                and now_ny > session_close
                and now_ny.time() <= POSTMARKET_END
            )

            if is_pre_market_state or pre_window:
                display_price = _first_price(analysis_price, pre_market_price, price, prev_close)
                price_session = "premarket"
                is_pre_market = True
                market_open = False
            elif is_after_hours_state or post_window:
                display_price = _first_price(analysis_price, post_market_price, price, prev_close)
                price_session = "postmarket"
                is_after_hours = True
                market_open = False
            elif market_open_flag:
                display_price = _first_price(analysis_price, regular_market_price, price)
                price_session = "regular"
                market_open = bool(display_price is not None and market_open_flag)
            else:
                display_price = _first_price(analysis_price, post_market_price, regular_market_price, price, prev_close)
                price_session = "closed"
                market_open = False

            if display_price is None:
                display_price = float(prev_close or 0)

            if is_closed_state:
                price_session = "closed"
                market_open = False

        if is_crypto_asset:
            post_end = None
            next_event = None
            next_session_label = None
        else:
            post_end = (
                datetime.combine(session_close.date(), POSTMARKET_END, tzinfo=NY_TZ)
                if session_close is not None
                else None
            )
            next_event = None
            next_session_label = None
            if price_session == "premarket" and session_open is not None:
                next_event = session_open
                next_session_label = "regular"
            elif price_session == "regular" and session_close is not None:
                next_event = session_close
                next_session_label = "postmarket"
            elif price_session == "postmarket" and post_end is not None:
                next_event = post_end
                next_session_label = "closed"
            else:
                next_event = _find_next_regular_open(now_ny)
                if next_event is not None:
                    next_session_label = "regular"

            if next_event is None:
                next_event = _find_next_regular_open(now_ny)
                if next_event is not None and next_session_label is None:
                    next_session_label = "regular"

        ref_prev_close = None
        if prev_close is not None:
            try:
                ref_prev_close = float(prev_close)
            except (TypeError, ValueError):
                ref_prev_close = None
        if ref_prev_close is None and analysis_prev_close is not None:
            ref_prev_close = float(analysis_prev_close)

        last_close = ref_prev_close if ref_prev_close is not None else display_price
        derived_yield = None
        if ttm_dividend and last_close:
            derived_yield = (ttm_dividend / float(last_close)) * 100
        elif dividend_yield_ratio is not None:
            derived_yield = float(dividend_yield_ratio) * 100

        try:
            performance_history = yt.history(period="1y", interval="1d")
        except Exception:
            performance_history = pd.DataFrame()
        performance = _build_performance(performance_history)

        if (volume is None or avg_volume is None) and not performance_history.empty:
            volumes_daily = performance_history["Volume"].dropna()
            if volume is None and not volumes_daily.empty:
                volume = float(volumes_daily.iloc[-1])
            if avg_volume is None and len(volumes_daily) >= 65:
                avg_volume = float(volumes_daily.tail(65).mean())
                avg_volume_label = avg_volume_label or "65-day"
            elif avg_volume is None and len(volumes_daily) >= 20:
                avg_volume = float(volumes_daily.tail(20).mean())
                avg_volume_label = avg_volume_label or "20-day"
            elif avg_volume is None and not volumes_daily.empty:
                avg_volume = float(volumes_daily.mean())
                avg_volume_label = avg_volume_label or "avg"

        if avg_volume is None and volume is not None:
            avg_volume = float(volume)
            avg_volume_label = avg_volume_label or "volume"

        display_price = float(display_price) if display_price is not None else None

        change = change_pct = None
        if display_price is not None and ref_prev_close is not None:
            change = float(display_price) - float(ref_prev_close)
            if ref_prev_close:
                change_pct = change / float(ref_prev_close)

        return {
            "ticker": ticker,
            "price": float(display_price or 0),
            "change": change,
            "changePercent": change_pct,
            "volume": int(volume) if volume is not None else None,
            "avgVolume": int(avg_volume) if avg_volume is not None else None,
            "avgVolumeLabel": avg_volume_label,
            "peRatio": float(pe_ratio) if pe_ratio is not None else None,
            "marketCap": int(market_cap) if market_cap is not None else None,
            "dayRange": {
                "low": float(day_low) if day_low is not None else None,
                "high": float(day_high) if day_high is not None else None,
            },
            "week52Range": {
                "low": float(week52_low) if week52_low is not None else None,
                "high": float(week52_high) if week52_high is not None else None,
            },
            "open": float(open_price) if open_price is not None else None,
            "previousClose": float(ref_prev_close) if ref_prev_close is not None else None,
            "sharesOutstanding": int(shares_out) if shares_out is not None else None,
            "floatShares": int(float_shares) if float_shares is not None else None,
            "beta": float(beta) if beta is not None else None,
            "eps": float(eps) if eps is not None else None,
            "dividendRate": float(ttm_dividend or dividend_rate) if (ttm_dividend or dividend_rate) is not None else None,
            "dividendYield": float(derived_yield) if derived_yield is not None else None,
            "dividendTTM": float(ttm_dividend) if ttm_dividend is not None else None,
            "lastDividend": float(last_dividend_amount) if last_dividend_amount is not None else None,
            "lastDividendDate": last_dividend_date,
            "lastDividendPayDate": _iso_date(last_dividend_ts),
            "exDividendDate": _iso_date(ex_dividend_ts),
            "nextDividendDate": _iso_date(next_dividend_ts),
            "dividendFrequency": dividend_frequency,
            "currency": currency,
            "marketState": market_state,
            "isPreMarket": is_pre_market,
            "isAfterHours": is_after_hours,
            "preMarketPrice": float(pre_market_price) if pre_market_price is not None else None,
            "postMarketPrice": float(post_market_price) if post_market_price is not None else None,
            "regularMarketPrice": float(regular_market_price) if regular_market_price is not None else None,
            "priceSession": price_session,
            "marketOpen": market_open,
            "marketTimezone": getattr(NY_TZ, "key", "America/New_York"),
            "instrumentType": "crypto" if is_crypto_asset else "equity",
            "lastClose": float(last_close) if last_close is not None else None,
            "analysisPrice": float(analysis_price) if analysis_price is not None else None,
            "analysisPrevClose": float(analysis_prev_close) if analysis_prev_close is not None else None,
            "nextSessionChange": next_event.isoformat() if next_event is not None else None,
            "nextSessionLabel": next_session_label,
            "performance": performance,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))

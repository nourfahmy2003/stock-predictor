# app/routes/symbols.py
from __future__ import annotations
import re, time, asyncio, random
from collections import OrderedDict
from typing import Any, Dict, List, Tuple

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

YH_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search"
YH_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

SYMBOL_RE = re.compile(r"^[A-Z0-9.\-]{1,15}$")
QUOTE_TYPES = {"EQUITY", "ETF", "INDEX", "CURRENCY", "CRYPTOCURRENCY", "MUTUALFUND"}

# ----- Cache -----
TTL = 900  # seconds
CACHE_SIZE = 512
_cache: OrderedDict[str, Tuple[float, Any]] = OrderedDict()

def _get_cache(key: str):
    hit = _cache.get(key)
    if not hit:
        return None
    ts, val = hit
    if time.time() - ts > TTL:
        _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return val

def _set_cache(key: str, val: Any):
    if key in _cache:
        _cache.move_to_end(key)
    _cache[key] = (time.time(), val)
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)

# ----- Throttle (per unique query) -----
_last_query_at: Dict[str, float] = {}
MIN_REQUERY_DELAY = 0.5  # seconds

async def _throttle(key: str):
    now = time.time()
    last = _last_query_at.get(key, 0.0)
    dt = now - last
    if dt < MIN_REQUERY_DELAY:
        await asyncio.sleep(MIN_REQUERY_DELAY - dt)
    _last_query_at[key] = time.time()

# ----- HTTP client defaults -----
HEADERS = {
    "User-Agent": "Mozilla/5.0 (MarketPulse; +https://example.com)",
    "Accept": "application/json",
}
LIMITS = httpx.Limits(max_keepalive_connections=5, max_connections=10)

async def _get_json_with_retries(url: str, params: dict) -> dict:
    delay = 0.5
    attempts = 4
    async with httpx.AsyncClient(timeout=6.0, headers=HEADERS, limits=LIMITS) as client:
        for i in range(attempts):
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except Exception:
                    raise HTTPException(502, "Invalid JSON from upstream.")
            if resp.status_code == 429:
                if i == attempts - 1:
                    # Surface the rate limit to the client
                    raise HTTPException(429, "Upstream rate limited. Please try again shortly.")
                ra = resp.headers.get("Retry-After")
                try:
                    if ra:
                        delay = max(delay, float(ra))
                except ValueError:
                    pass
            elif 500 <= resp.status_code < 600:
                if i == attempts - 1:
                    raise HTTPException(502, "Upstream error from Yahoo Finance.")
            else:
                # Forward any other error as-is
                raise HTTPException(resp.status_code, resp.text or "Upstream error")
            await asyncio.sleep(delay + random.random() * 0.35)
            delay *= 1.8
    raise HTTPException(502, "Request failed")

def _normalize_quote(q: Dict[str, Any]) -> Dict[str, Any] | None:
    sym = (q.get("symbol") or "").upper()
    qt = (q.get("quoteType") or "").upper()
    if not sym or not SYMBOL_RE.match(sym):
        return None
    if qt and qt not in QUOTE_TYPES:
        return None
    name = q.get("shortname") or q.get("longname") or q.get("name") or ""
    return {
        "symbol": sym,
        "name": name,
        "exchange": q.get("exchange") or "",
        "exchangeDisp": q.get("exchDisp") or q.get("exchangeDisplay") or "",
        "type": qt or "",
        "region": q.get("region") or "",
        "currency": q.get("currency") or "",
    }

# ---------------------------
# Routes
# ---------------------------

@router.get("/symbols/search")
async def symbols_search(
    q: str = Query(..., min_length=1, max_length=50),
    region: str = Query("US"),
    lang: str = Query("en-US"),
    limit: int = Query(10, ge=1, le=25),
):
    q_norm = q.strip()
    if not q_norm:
        raise HTTPException(422, "Query cannot be empty.")

    cache_key = f"yh_search:{region}:{lang}:{limit}:{q_norm.upper()}"
    if (c := _get_cache(cache_key)) is not None:
        return {"items": c}

    # light per-key throttle
    await _throttle(cache_key)

    data = await _get_json_with_retries(
        YH_SEARCH, {"q": q_norm, "lang": lang, "region": region, "quotesCount": limit, "newsCount": 0}
    )

    items_raw = (data or {}).get("quotes") or []
    items: List[Dict[str, Any]] = []
    seen = set()
    for qitem in items_raw:
        norm = _normalize_quote(qitem)
        if not norm:
            continue
        if norm["symbol"] in seen:
            continue
        seen.add(norm["symbol"])
        items.append(norm)

    # Sort: exact match first, then prefix matches, then others
    query_up = q_norm.upper()
    def score(it):
        sym = it["symbol"]
        if sym == query_up: return 0
        if sym.startswith(query_up): return 1
        return 2

    items.sort(key=score)
    items = items[:limit]

    _set_cache(cache_key, items)
    return {"items": items}

@router.get("/symbols/validate")
async def symbols_validate(
    symbol: str = Query(...),
    region: str = Query("US"),
    lang: str = Query("en-US"),
):
    sym = (symbol or "").strip().upper()
    if not SYMBOL_RE.match(sym):
        return {"valid": False, "reason": "invalid_format", "symbol": sym}

    cache_key = f"yh_validate:{sym}:{region}:{lang}"
    if (c := _get_cache(cache_key)) is not None:
        return c

    await _throttle(cache_key)

    try:
        data = await _get_json_with_retries(
            YH_CHART.format(symbol=sym),
            {"range": "5d", "interval": "1d", "region": region, "lang": lang},
        )
    except HTTPException as e:
        # If upstream rate-limits, report a soft failure so the UI can retry later.
        if e.status_code == 429:
            out = {"valid": False, "symbol": sym, "reason": "rate_limited"}
            _set_cache(cache_key, out)
            return out
        raise

    result = (((data or {}).get("chart") or {}).get("result") or [None])[0]
    valid = bool(
        result and (
            (result.get("timestamp") and len(result["timestamp"]) > 0) or
            (((result.get("indicators") or {}).get("quote") or [{}])[0].get("close"))
        )
    )
    out = {"valid": valid, "symbol": sym}
    _set_cache(cache_key, out)
    return out

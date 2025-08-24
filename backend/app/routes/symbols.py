from __future__ import annotations
import re, time
from collections import OrderedDict
from typing import Any, Dict

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

YH_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search"
YH_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

SYMBOL_RE = re.compile(r"^[A-Z0-9.\-]{1,15}$")
QUOTE_TYPES = {"EQUITY", "ETF", "INDEX", "CURRENCY", "CRYPTOCURRENCY", "MUTUALFUND"}

_cache: OrderedDict[str, tuple[float, Any]] = OrderedDict()
TTL = 900  # seconds
CACHE_SIZE = 512

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


@router.get("/symbols/search")
async def symbols_search(q: str = Query(..., min_length=1, max_length=50)):
    q_norm = q.strip()
    if not q_norm:
        raise HTTPException(422, "Query cannot be empty.")
    cache_key = f"yh_search:{q_norm}"
    if (c := _get_cache(cache_key)) is not None:
        return {"items": c}

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(
                YH_SEARCH, params={"q": q_norm, "lang": "en-US", "region": "US"}
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        raise HTTPException(502, f"Yahoo search failed: {e}")

    items_raw = (data or {}).get("quotes") or []
    items = []
    seen = set()
    for qitem in items_raw:
        norm = _normalize_quote(qitem)
        if not norm:
            continue
        if norm["symbol"] in seen:
            continue
        seen.add(norm["symbol"])
        items.append(norm)

    query_up = q_norm.upper()
    def score(it):
        sym = it["symbol"]
        if sym == query_up:
            return 0
        if sym.startswith(query_up):
            return 1
        return 2

    items.sort(key=score)
    items = items[:20]
    _set_cache(cache_key, items)
    return {"items": items}


@router.get("/symbols/validate")
async def symbols_validate(symbol: str = Query(...)):
    sym = (symbol or "").strip().upper()
    if not SYMBOL_RE.match(sym):
        return {"valid": False, "reason": "invalid_format", "symbol": sym}
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(
                YH_CHART.format(symbol=sym), params={"range": "5d", "interval": "1d"}
            )
            r.raise_for_status()
            j = r.json()
            result = (((j or {}).get("chart") or {}).get("result") or [None])[0]
            valid = bool(
                result
                and (
                    (result.get("timestamp") and len(result["timestamp"]) > 0)
                    or (
                        (
                            (result.get("indicators") or {}).get("quote") or [{}]
                        )[0].get("close")
                    )
                )
            )
            return {"valid": valid, "symbol": sym}
    except Exception:
        return {"valid": False, "symbol": sym, "reason": "yahoo_error"}

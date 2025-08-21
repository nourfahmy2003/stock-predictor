from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import re

from app.utils.sec import (
    ticker_to_cik,
    sec_fetch,
    build_filing_url,
    sleep,
    fetch_filing_text,
)

router = APIRouter()


@router.get("/filings/{ticker}/company")
def company(ticker: str):
    try:
        cik = ticker_to_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail="CIK not found")
        data = sec_fetch(f"https://data.sec.gov/submissions/CIK{cik}.json")
        payload = {
            "ticker": ticker.upper(),
            "cik": cik,
            "name": data.get("entityName") or data.get("name") or data.get("companyName"),
        }
        return JSONResponse(payload, headers={"Cache-Control": "s-maxage=86400"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filings/{ticker}/list")
def filings_list(
    ticker: str,
    types: str = Query(""),
    limit: int = Query(100),
):
    try:
        cik = ticker_to_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail="CIK not found")
        data = sec_fetch(f"https://data.sec.gov/submissions/CIK{cik}.json")
        recent = data.get("filings", {}).get("recent")
        if not recent:
            return []
        type_list = [t.strip() for t in types.split(",") if t.strip()]
        results = []
        for i, form in enumerate(recent.get("form", [])):
            if len(results) >= limit:
                break
            if type_list and form not in type_list:
                continue
            accession = recent["accessionNumber"][i]
            filed = recent["filingDate"][i]
            period = recent["reportDate"][i]
            primary_doc = recent["primaryDocument"][i]
            size = recent["size"][i]
            url = build_filing_url(cik, accession, primary_doc)
            url_txt = build_filing_url(cik, accession, f"{accession}.txt")
            results.append(
                {
                    "type": form,
                    "filed": filed,
                    "period": period,
                    "accession": accession,
                    "url": url,
                    "urlHtml": url,
                    "urlTxt": url_txt,
                    "size": size,
                }
            )
        return JSONResponse(results, headers={"Cache-Control": "s-maxage=3600"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filings/{ticker}/doc")
def filing_doc(ticker: str, accession: str = Query(...)):
    try:
        cik = ticker_to_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail="CIK not found")
        sleep(400)
        try:
            text = fetch_filing_text(cik, accession)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="document not found")
        return JSONResponse({"text": text}, headers={"Cache-Control": "s-maxage=86400"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract(text: str, pattern: str):
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    start = m.start()
    excerpt = text[start : start + 600]
    return {"excerpt": excerpt, "index": start}


@router.get("/filings/{ticker}/highlights")
def highlights(ticker: str, accession: str = Query(...)):
    try:
        cik = ticker_to_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail="CIK not found")
        text = fetch_filing_text(cik, accession)
        res = {
            "mdna": _extract(text, r"management[’'`]?s\s+discussion"),
            "risks": _extract(text, r"risk\s+factors"),
            "liquidity": _extract(text, r"liquidity\s+and\s+capital\s+resources"),
            "business": _extract(text, r"^\s*business\b"),
        }
        return JSONResponse(res, headers={"Cache-Control": "s-maxage=3600"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

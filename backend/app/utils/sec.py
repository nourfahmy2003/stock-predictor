import os
import json
import time
from pathlib import Path
import re

import requests

SEC_UA = os.getenv("SEC_UA", "stock-predictor app")
SEC_BASE = "https://data.sec.gov"

with open(Path(__file__).parent / "cik_map.json", "r") as f:
    CIK_MAP = json.load(f)

session = requests.Session()
session.headers.update({"User-Agent": SEC_UA})


def sec_fetch(url: str, type: str = "json", headers: dict | None = None):
    hdrs = {"Accept": "text/plain" if type == "text" else "application/json"}
    if headers:
        hdrs.update(headers)
    resp = session.get(url, headers=hdrs, timeout=20)
    resp.raise_for_status()
    return resp.text if type == "text" else resp.json()


def sleep(ms: int):
    time.sleep(ms / 1000)


def ticker_to_cik(ticker: str) -> str | None:
    t = ticker.upper()
    if t in CIK_MAP:
        return CIK_MAP[t]
    try:
        data = sec_fetch(f"{SEC_BASE}/api/xbrl/companyfacts/{t}.json")
        cik = data.get("cik")
        if cik:
            return str(cik).zfill(10)
    except Exception:
        pass
    return None


def build_filing_url(cik: str, accession: str, file: str) -> str:
    cik_num = str(int(cik))
    acc_no = accession.replace("-", "")
    return f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{acc_no}/{file}"


def fetch_filing_text(cik: str, accession: str) -> str:
    """Retrieve filing text with .txt -> HTML fallback."""
    acc_no = accession.replace("-", "")
    base = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_no}"

    txt_url = f"{base}/{accession}.txt"
    try:
        return sec_fetch(txt_url, type="text")
    except Exception:
        pass

    index = sec_fetch(f"{base}/index.json")
    items = index.get("directory", {}).get("item", [])
    primary = next(
        (i.get("name") for i in items if str(i.get("type", "")).startswith("text/html")),
        None,
    )
    if not primary and items:
        primary = items[0].get("name")
    if not primary:
        raise FileNotFoundError("primary document not found")

    html_url = f"{base}/{primary}"
    html = sec_fetch(html_url, type="text", headers={"Accept": "text/html"})
    html = re.sub(r"<(br|BR)\s*/?>", "\n", html)
    html = re.sub(r"</(p|div|tr|h[1-6])>", "\n", html)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\r", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

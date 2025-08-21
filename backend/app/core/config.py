import os
import logging
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import requests

NOTEBOOK_PATH = os.getenv("NOTEBOOK_PATH", "notebooks/Stock_LSTM_10day.ipynb")
HF_TOKEN = os.getenv("HF_TOKEN")
SHOW_DEBUG = bool(int(os.getenv("SHOW_DEBUG", "0")))
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

session = requests.Session()
session.headers.update({"User-Agent": UA})
retry = Retry(total=3, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

logging.basicConfig(level=logging.DEBUG if SHOW_DEBUG else logging.INFO)

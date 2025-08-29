import os
import logging
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("stock-predictor")

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

UA_HDRS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}
HTTP_TIMEOUT = 20

session = requests.Session()
session.headers.update(UA_HDRS)

def make_app() -> FastAPI:
    app = FastAPI(title="Stock Predictor Backend")

    # Load allowed origins from the environment.  Accept a comma separated list
    # and trim any trailing slashes so the origin check matches the browser's
    # Origin header exactly (which never includes a trailing slash).
    origins_env = os.getenv("FRONTEND_ORIGIN", "")
    origins = ["http://localhost:3000"]
    if origins_env:
        origins += [o.strip().rstrip("/") for o in origins_env.split(",") if o.strip()]

    logger.info("CORS allowed origins: %s", origins)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app

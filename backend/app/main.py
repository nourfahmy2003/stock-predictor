import asyncio
import os

from app.core.config import make_app, logger
from app.routes import forecast, overview, chart, extract, news, filings, backtest, symbols
from app.services.sentiment import preload

app = make_app()

app.include_router(forecast.router)
app.include_router(overview.router)
app.include_router(chart.router)
app.include_router(extract.router)
app.include_router(news.router)
app.include_router(filings.router)
app.include_router(backtest.router)
app.include_router(symbols.router, prefix="/api", tags=["symbols"])


@app.on_event("startup")
async def _warmup():
    try:
        await asyncio.to_thread(preload)
    except Exception as e:
        logger.warning("Sentiment warmup skipped: %s", e)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

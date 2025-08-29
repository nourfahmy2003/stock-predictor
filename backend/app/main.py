import os

from app.core.config import make_app
from app.routes import (
    forecast,
    overview,
    chart,
    extract,
    news,
    filings,
    backtest,
    symbols,
    patterns,
)

app = make_app()

app.include_router(forecast.router)
app.include_router(overview.router)
app.include_router(chart.router)
app.include_router(extract.router)
app.include_router(news.router)
app.include_router(filings.router)
app.include_router(backtest.router)
app.include_router(symbols.router)
app.include_router(patterns.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ["PORT"]))

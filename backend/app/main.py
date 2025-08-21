from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, predict, overview, chart, news, extract

app = FastAPI(title="Notebook Runner (Papermill)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(overview.router)
app.include_router(chart.router)
app.include_router(news.router)
app.include_router(extract.router)

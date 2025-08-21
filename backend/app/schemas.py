from pydantic import BaseModel, Field


class PredictIn(BaseModel):
    ticker: str
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)


class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: list

class BacktestPoint(BaseModel):
    date: str
    pred: float
    actual: float


class BacktestMetrics(BaseModel):
    rmse: float
    mape: float
    sharpe: float
    cumulative_return: float


class BacktestOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    metrics: BacktestMetrics
    results: list[BacktestPoint]

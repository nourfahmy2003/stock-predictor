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

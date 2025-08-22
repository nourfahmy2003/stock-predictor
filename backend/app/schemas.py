from typing import Literal, Optional
from pydantic import BaseModel, Field


class PredictIn(BaseModel):
    ticker: str
    look_back: int = Field(60, ge=10, le=365)
    horizon: int = Field(10, ge=1, le=60)


class ForecastPoint(BaseModel):
    date: str
    actual: float | None = None
    pred_back: float | None = None
    pred_fore: float | None = None


class ForecastPayload(BaseModel):
    metrics: dict
    series: list[ForecastPoint]


class ForecastOut(BaseModel):
    ticker: str
    look_back: int
    horizon: int
    forecast: ForecastPayload


# --- legacy LSTM backtest schemas ---
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


# --- new strategy backtest schemas ---
class Strategy(BaseModel):
    type: Literal["buy_hold", "sma_crossover", "rsi"]
    params: dict = {}


class Costs(BaseModel):
    slippage_bps: float = 0
    commission_per_trade: float = 0


class BacktestRunIn(BaseModel):
    ticker: str
    range: Literal["1y", "3y", "5y", "max"] = "1y"
    interval: Literal["1d", "1wk"] = "1d"
    strategy: Strategy
    initial_cash: float = 10000
    costs: Costs = Costs()


class EquityPoint(BaseModel):
    t: str
    value: float


class DrawdownPoint(BaseModel):
    t: str
    dd: float


class TradePoint(BaseModel):
    t: str
    side: Literal["buy", "sell"]
    price: float
    qty: float
    pnl: Optional[float] = None


class BarReturn(BaseModel):
    t: str
    ret: float


class BacktestMetricsV2(BaseModel):
    startValue: float
    endValue: float
    returnPct: float
    cagr: float
    sharpe: float
    sortino: float
    volatility: float
    maxDrawdownPct: float
    winRate: float
    avgWin: float
    avgLoss: float
    numTrades: int
    exposurePct: float


class BacktestResult(BaseModel):
    ticker: str
    equity: list[EquityPoint]
    drawdown: list[DrawdownPoint]
    trades: list[TradePoint]
    barReturns: list[BarReturn]
    metrics: BacktestMetricsV2


class BacktestStatus(BaseModel):
    state: Literal["queued", "running", "done", "error"]
    pct: int = 0
    etaSeconds: Optional[int] = None
    message: Optional[str] = None


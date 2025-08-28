from __future__ import annotations

"""Routes for YOLO-based chart pattern detection.

This is a lightweight placeholder implementation that exposes the REST
interface expected by the frontend.  The actual ML model integration will be
implemented later.
"""
from datetime import datetime, timezone
import base64
import io
import os
import uuid
from typing import List

from fastapi import APIRouter, Query, UploadFile, File, Form, HTTPException
from PIL import Image, ImageDraw, ImageFont

try:
    from ultralytics import YOLO

    YOLO_MODEL_PATH = os.getenv(
        "YOLO_WEIGHTS", "foduucom/stockmarket-pattern-detection-yolov8"
    )
    _YOLO_MODEL = YOLO(YOLO_MODEL_PATH)
except Exception as e:  # pragma: no cover - model is optional for tests
    _YOLO_MODEL = None

LABEL_MEANINGS = {
    "Head and shoulders top": "Bearish reversal. Left shoulder–Head–Right shoulder; neckline breaks down → downside target ≈ head-to-neckline distance.",
    "Head and shoulders bottom": "Bullish reversal (Inverse H&S). Breakout above neckline; target ≈ head-to-neckline distance.",
    "M_Head": "Bearish M-shape / double-top variant. Two peaks with a middle dip; breakdown confirms weakness.",
    "W_Bottom": "Bullish W-shape / double-bottom. Two troughs with a middle peak; breakout confirms strength.",
    "Triangle": "Consolidation (sym/asc/desc not distinguished by label). Breakout direction matters; use breakout candle + retest.",
    "StockLine": "Trendline segment detected (support/resistance). Use as contextual S/R; breaks can signal continuation or reversal.",
}

BULLISH = {"Head and shoulders bottom", "W_Bottom"}
BEARISH = {"Head and shoulders top", "M_Head"}


def _summarise(dets: List[dict], interval: str):
    bullish = [d for d in dets if d["label"] in BULLISH]
    bearish = [d for d in dets if d["label"] in BEARISH]
    if bullish and not bearish:
        trend = "Bullish"
    elif bearish and not bullish:
        trend = "Bearish"
    else:
        trend = "Mixed"

    max_bull = max([d["conf"] for d in bullish], default=0)
    max_bear = max([d["conf"] for d in bearish], default=0)
    signal = "Watch"
    if bullish and not bearish and max_bull >= 0.75:
        signal = "Add to Watchlist"
    elif bearish and not bullish and max_bear >= 0.75:
        signal = "Reduce"

    count = len(dets)
    if count <= 1:
        risk = "Low"
    elif count <= 3:
        risk = "Medium"
    else:
        risk = "High"

    recognised = [
        {"label": d["label"], "conf": d["conf"], "meaning": LABEL_MEANINGS.get(d["label"], "")}
        for d in dets
    ]

    dur_map = {
        "1m": "Minutes to hours",
        "5m": "Minutes to hours",
        "1h": "Hours to days",
        "1d": "Days to weeks",
    }

    game_plan = {
        "entryExit": (
            "Use neckline or trendline breaks for entries and place stops beyond support/resistance."
        ),
        "riskReward": (
            "Target risk/reward ≥ 1.5:1; reduce position size if signals conflict."
        ),
        "durationMonitoring": dur_map.get(interval, "Varies with interval"),
        "indicators": (
            "Confirm with SMA20/50/200 and RSI divergence before acting."
        ),
        "recognizedPatterns": recognised,
    }

    insights = {"trend": trend, "signal": signal, "risk": risk}
    return insights, game_plan

router = APIRouter(prefix="/patterns", tags=["patterns"])

@router.get("/symbols")
async def list_symbols():
    """Return supported symbols for pattern detection.

    For now this simply returns an empty list.  The real implementation should
    mirror the application's universe of tickers.
    """
    return {"items": []}

@router.get("/detect")
async def detect_patterns(
    symbol: str = Query(..., description="Ticker symbol"),
    interval: str = Query(
        "1d", regex="^(5y|1y|3mo|1mo|1d|1h|5m|1m)$"
    ),
    lookback: int = Query(250, ge=1, le=1000),
    returnImage: bool = Query(False),
    withOverlay: bool = Query(False),
    cache: bool = Query(True),
):
    """Run pattern detection for a symbol/timeframe.

    This placeholder returns an empty detection result.  A future update will
    generate a candlestick chart, run YOLOv8 inference and optionally return
    chart images with overlayed bounding boxes.
    """
    now = datetime.now(timezone.utc).isoformat()
    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "asOf": now,
        "detections": [],
        "imageUrl": None,
        "rawImageUrl": None,
    }


@router.post("/detect")
async def detect_patterns_upload(
    symbol: str = Form("", description="Ticker symbol"),
    interval: str = Form("1d", regex="^(5y|1y|3mo|1mo|1d|1h|5m|1m)$"),
    lookback: int = Form(250, ge=1, le=1000),
    returnImage: bool = Form(False),
    withOverlay: bool = Form(False),
    cache: bool = Form(True),
    image: UploadFile | None = File(None),
):
    """Run pattern detection on an uploaded chart image.

    This placeholder accepts an optional ``image`` upload and returns a mock
    detection payload.  The actual YOLOv8 integration will consume the image
    and produce real detections in a future update.
    """

    now = datetime.now(timezone.utc).isoformat()
    detections = []
    if image is not None:
        # Pretend we ran inference and found a pattern when an image is supplied.
        detections = [
            {"label": "head_and_shoulders", "conf": 0.87, "bbox": [100, 80, 200, 150]}
        ]

    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "asOf": now,
        "detections": detections,
        "imageUrl": None,
        "rawImageUrl": None,
    }


@router.post("/detect-image")
async def detect_image(
    file: UploadFile = File(...),
    interval: str = Form("auto"),
    symbol: str | None = Form(None),
    minConf: float = Form(0.6),
    withOverlay: bool = Form(True),
):
    """Run YOLOv8 pattern detection on an uploaded chart screenshot."""

    if _YOLO_MODEL is None:
        raise HTTPException(status_code=500, detail="YOLO model not loaded")

    data = await file.read()
    raw_img = Image.open(io.BytesIO(data)).convert("RGB")
    results = _YOLO_MODEL.predict(raw_img, conf=minConf, verbose=False)[0]
    dets: List[dict] = []

    draw = ImageDraw.Draw(raw_img) if withOverlay else None
    for box in results.boxes:
        cls = int(box.cls)
        raw_label = results.names.get(cls, str(cls))
        label = raw_label
        conf = float(box.conf)
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
        det = {
            "label": label,
            "conf": conf,
            "bbox": [x1, y1, x2 - x1, y2 - y1],
        }
        dets.append(det)
        if draw:
            draw.rectangle([x1, y1, x2, y2], outline="red", width=2)
            draw.rectangle([x1, y1 - 18, x1 + 140, y1], fill="red")
            draw.text((x1 + 4, y1 - 16), f"{label} ({conf:.2f})", fill="white")

    overlay_url = None
    if withOverlay and draw:
        buf = io.BytesIO()
        raw_img.save(buf, format="PNG")
        overlay_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    raw_buf = io.BytesIO()
    Image.open(io.BytesIO(data)).save(raw_buf, format="PNG")
    raw_url = "data:image/png;base64," + base64.b64encode(raw_buf.getvalue()).decode()

    insights, game_plan = _summarise(dets, interval)
    now = datetime.now(timezone.utc).isoformat()
    return {
        "symbol": symbol.upper() if symbol else None,
        "interval": interval,
        "asOf": now,
        "detections": dets,
        "imageUrl": overlay_url,
        "rawImageUrl": raw_url,
        "insights": insights,
        "gamePlan": game_plan,
    }


@router.get("/overview")
async def overview(
    interval: str = Query("1y", regex="^(5y|1y|3mo|1mo|1d|1h|5m|1m)$")
):
    """Return a placeholder set of high-confidence detections.

    The real implementation will scan a universe of tickers and rank the
    detections by confidence for the requested interval.
    """
    now = datetime.now(timezone.utc).isoformat()
    items = [
        {
            "symbol": "AAPL",
            "label": "double_bottom",
            "conf": 0.82,
            "interval": interval,
            "updated": now,
        }
    ]
    return {"interval": interval, "items": items}

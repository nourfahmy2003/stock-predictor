# app/routes/patterns.py
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from ..services.yolo_live import detect_from_base64

router = APIRouter(prefix="/patterns", tags=["patterns"])

class DetectIn(BaseModel):
    ticker: str
    image_base64: str

@router.post("/detect")
def detect(req: DetectIn) -> Dict[str, Any]:
    dets = detect_from_base64(req.image_base64)
    return {"ticker": req.ticker.upper(), "detections": dets}

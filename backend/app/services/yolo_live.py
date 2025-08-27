# app/services/yolo_live.py
from __future__ import annotations
import os, io, base64, numpy as np
from PIL import Image
from ultralytics import YOLO

YOLO_WEIGHTS = os.getenv("YOLO_WEIGHTS", "models/yolo/best.pt")
LABELS = ['Head and shoulders bottom','Head and shoulders top','M_Head','StockLine','Triangle','W_Bottom']

_model = None
def _get_model():
    global _model
    if _model is None:
        if not os.path.exists(YOLO_WEIGHTS):
            raise RuntimeError(f"YOLO weights not found: {YOLO_WEIGHTS}")
        _model = YOLO(YOLO_WEIGHTS)
    return _model

def detect_from_base64(image_b64: str):
    b64 = image_b64.split(",")[-1]
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
    arr = np.array(img)
    r = _get_model().predict(arr, verbose=False, save=False)[0]
    out = []
    if r.boxes:
        for b in r.boxes:
            cls = int(b.cls.item()); conf = float(b.conf.item())
            out.append({"label": LABELS[cls], "confidence": conf})
    return out

# app/routes/patterns.py
import io, os, time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

try:
    from ultralytics import YOLO
except Exception as e:
    raise RuntimeError("Ultralytics not installed. pip install 'ultralytics>=8.0.0'") from e

router = APIRouter(prefix="/patterns", tags=["patterns"])

_MODEL = None

def _assert_checkpoint_looks_valid(path: str):
    if not os.path.exists(path):
        raise HTTPException(500, detail=f"YOLO weights not found at {path}")
    sz = os.path.getsize(path)
    if sz < 5_000_000:
        raise HTTPException(500, detail=f"YOLO weights too small ({sz} bytes) – download likely failed.")
    with open(path, "rb") as f:
        head = f.read(128)
    if head.startswith(b"version https://git-lfs.github.com"):
        raise HTTPException(500, detail="YOLO weights is a Git-LFS pointer file, not the real .pt.")
    if head.startswith(b"<!DOCTYPE") or head.lower().startswith(b"<html") or head.startswith(b"Error"):
        raise HTTPException(500, detail="YOLO weights appears to be HTML/error page. Redownload using huggingface_hub.")

def _resolve_weights() -> str:
    cand = [
        os.getenv("YOLO_WEIGHTS", "").strip(),
        os.path.join(os.getcwd(), "weights", "patterns.pt"),
        os.path.join(os.getcwd(), "weights", "best.pt"),
        os.path.join(os.getcwd(), "weights", "model.pt"),
    ]
    for c in cand:
        if c and os.path.exists(c):
            return c
    raise HTTPException(
        500,
        detail=("YOLO weights not found. Download 'model.pt' from "
                "foduucom/stockmarket-pattern-detection-yolovv8 and set "
                "YOLO_WEIGHTS=/abs/path/to/model.pt or place it at ./weights/model.pt"),
    )

def _get_model():
    global _MODEL
    if _MODEL is None:
        weights = _resolve_weights()
        _assert_checkpoint_looks_valid(weights)
        m = YOLO(weights)
        dev = os.getenv("YOLO_DEVICE", "auto").strip()
        if dev != "auto":
            try:
                m.to(dev)
            except Exception:
                pass
        _MODEL = m
    return _MODEL

def _run_yolo(img: Image.Image, *, conf: float, imgsz: int, iou: float, max_det: int):
    return _get_model().predict(
        source=img, conf=conf, iou=iou, imgsz=imgsz, max_det=max_det, verbose=False
    )[0]

def _boxes_to_dets(pred, x_off=0, y_off=0) -> List[Dict[str, Any]]:
    names = getattr(pred, "names", {}) or {}
    dets = []
    for b in getattr(pred, "boxes", []) or []:
        cls = int(b.cls[0])
        label = names.get(cls, str(cls))
        conf = float(b.conf[0])
        x1, y1, x2, y2 = map(float, b.xyxy[0])
        dets.append({
            "label": label,
            "conf": round(conf, 6),
            "bbox": [int(x1 + x_off), int(y1 + y_off), int((x2 - x1)), int((y2 - y1))],
        })
    return dets

@router.post("/detect-image")
async def detect_image(
    file: UploadFile = File(...),
    symbol: Optional[str] = Form(None),
    interval: str = Form("auto"),
    focus: str = Form("recent"),         # <<---- "recent" | "full" | "left"
    withOverlay: bool = Form(False),
    debug: bool = Form(False),
):
    """
    Detect chart patterns on an uploaded screenshot.
    """
    # Tunables
    MIN_CONF = float(os.getenv("YOLO_MIN_CONF", "0.25"))
    IMG_SIZE = int(os.getenv("YOLO_IMG_SIZE", "1280"))
    IOU      = float(os.getenv("YOLO_IOU", "0.5"))
    MAX_DET  = int(os.getenv("YOLO_MAX_DET", "100"))

    ROI_FRAC   = float(os.getenv("YOLO_ROI_FRAC", "0.35"))  # width fraction for ROI
    ROI_STRICT = os.getenv("YOLO_ROI_STRICT", "false").lower() in ("1","true","yes")

    raw = await file.read()
    try:
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, detail="Invalid image file.")

    W, H = pil.size  # PIL gives (W,H)
    t0 = time.time()

    detections: List[Dict[str, Any]] = []
    used_roi = None

    # 1) ROI pass (rightmost/leftmost) if requested
    if focus in ("recent", "right", "left"):
        frac = max(0.05, min(0.95, ROI_FRAC))
        if focus in ("recent", "right"):
            x0 = int(W * (1.0 - frac))
            crop = pil.crop((x0, 0, W, H))
            pred_roi = _run_yolo(crop, conf=MIN_CONF, imgsz=IMG_SIZE, iou=IOU, max_det=MAX_DET)
            det_roi  = _boxes_to_dets(pred_roi, x_off=x0, y_off=0)
            if det_roi:
                detections = det_roi
                used_roi = {"side": "right", "frac": frac, "x0": x0}
            elif ROI_STRICT:
                detections = []
                used_roi = {"side": "right", "frac": frac, "x0": x0, "strict": True}
        else:  # focus == "left"
            x1 = int(W * frac)
            crop = pil.crop((0, 0, x1, H))
            pred_roi = _run_yolo(crop, conf=MIN_CONF, imgsz=IMG_SIZE, iou=IOU, max_det=MAX_DET)
            det_roi  = _boxes_to_dets(pred_roi, x_off=0, y_off=0)
            if det_roi:
                detections = det_roi
                used_roi = {"side": "left", "frac": frac, "x1": x1}
            elif ROI_STRICT:
                detections = []
                used_roi = {"side": "left", "frac": frac, "x1": x1, "strict": True}

    # 2) Fallback to full image if ROI empty (and not strict) or focus=="full"
    if (focus == "full") or (not detections and not ROI_STRICT):
        pred_full = _run_yolo(pil, conf=MIN_CONF, imgsz=IMG_SIZE, iou=IOU, max_det=MAX_DET)
        det_full  = _boxes_to_dets(pred_full)
        if not detections:
            detections = det_full
        else:
            # Optionally merge: keep ROI detections and add full if you want both
            pass

    # Sort by x-center descending so rightmost patterns appear first
    detections.sort(key=lambda d: d["bbox"][0] + d["bbox"][2] * 0.5, reverse=True)

    latency_ms = int((time.time() - t0) * 1000)
    empty_reason = None
    if not detections:
        empty_reason = (
            "No patterns met the current thresholds. Try a higher-resolution screenshot "
            "or lower YOLO_MIN_CONF (currently %s)."
        ) % MIN_CONF

    payload = {
        "symbol": symbol,
        "interval": interval or "auto",
        "asOf": datetime.now(timezone.utc).isoformat(),
        "detections": detections,
        "imageUrl": None,
        "rawImageUrl": None,
        "latencyMs": latency_ms,
        "emptyReason": empty_reason,
        "roiUsed": used_roi,
    }
    if debug:
        payload["meta"] = {
            "imageWidth": W, "imageHeight": H,
            "conf": MIN_CONF, "imgsz": IMG_SIZE, "iou": IOU, "max_det": MAX_DET,
            "focus": focus, "roi_frac": ROI_FRAC, "roi_strict": ROI_STRICT,
        }
    return JSONResponse(payload)

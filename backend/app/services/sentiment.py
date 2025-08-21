import asyncio
import threading

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from app.core.config import logger
from app.utils.text import _preview

MODEL_ID = "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis"
_LOAD_LOCK = threading.Lock()
_CLASSIFY_SEM = asyncio.Semaphore(1)
_tok = None
_mdl = None


def _get_sentiment_components():
    global _tok, _mdl
    if _tok is None or _mdl is None:
        with _LOAD_LOCK:
            if _tok is None or _mdl is None:
                logger.info("Loading sentiment model: %s", MODEL_ID)
                _tok = AutoTokenizer.from_pretrained(MODEL_ID)
                _mdl = AutoModelForSequenceClassification.from_pretrained(
                    MODEL_ID, torch_dtype=torch.float32
                )
                _mdl.to("cpu").eval()
    return _tok, _mdl


def preload():
    _get_sentiment_components()


def _norm_label_binary(label: str, score: float, neutral_band: float = 0.55):
    L = (label or "").lower()
    if score < neutral_band:
        return "neutral", 3
    if L in ("label_1", "positive", "pos"):
        return "positive", 5
    if L in ("label_0", "negative", "neg"):
        return "negative", 1
    return "neutral", 3


def _classify_one(text: str, max_len: int = 512, stride: int = 64):
    tok, mdl = _get_sentiment_components()
    if not text:
        return {"sentiment": "neutral", "stars": 3, "confidence": 0.0, "raw_label": "neutral"}

    enc = tok(text, return_tensors="pt", truncation=False)
    input_ids = enc["input_ids"][0]
    attn = enc["attention_mask"][0]
    total_len = int(input_ids.shape[0])

    if total_len <= max_len:
        with torch.no_grad():
            out = mdl(**{k: v for k, v in enc.items()})
            logits = out.logits[0]
    else:
        windows = []
        step = max_len - stride
        for start in range(0, total_len, step):
            end = min(start + max_len, total_len)
            chunk = {
                "input_ids": input_ids[start:end].unsqueeze(0),
                "attention_mask": attn[start:end].unsqueeze(0),
            }
            with torch.no_grad():
                out = mdl(**chunk)
                windows.append(out.logits[0])
            if end == total_len:
                break
        logits = torch.stack(windows, dim=0).mean(dim=0)

    probs = torch.softmax(logits, dim=-1)
    score, idx = torch.max(probs, dim=-1)
    raw_label = _mdl.config.id2label[int(idx)]
    sentiment, stars = _norm_label_binary(raw_label, float(score))
    return {
        "sentiment": sentiment,
        "stars": stars,
        "confidence": float(score),
        "raw_label": raw_label,
    }


def classify_texts(texts):
    out = []
    for t in texts:
        r = _classify_one(t)
        out.append(r)
        logger.info(
            "NEWS SENTIMENT | %d★ (%.3f) | [%s] %s",
            r["stars"], r["confidence"], MODEL_ID.split("/")[-1], _preview(t)
        )
    return out

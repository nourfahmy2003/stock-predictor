from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

MODEL_ID = "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis"
_tokenizer = None
_model = None


def _get_sentiment_components():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    return _tokenizer, _model


def _classify_one(tokenizer, model, text: str) -> dict:
    inputs = tokenizer(text, return_tensors="pt", truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=1)[0]
    label_id = int(probs.argmax())
    label = model.config.id2label[label_id].lower()
    confidence = float(probs[label_id])
    stars = 5 if label == "positive" else 1 if label == "negative" else 3
    return {"sentiment": label, "stars": stars, "confidence": confidence}


def classify_texts(texts: list[str]) -> list[dict]:
    tokenizer, model = _get_sentiment_components()
    return [_classify_one(tokenizer, model, t) for t in texts]

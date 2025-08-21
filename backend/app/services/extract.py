import trafilatura


def _extract_article_text(url: str) -> str:
    downloaded = trafilatura.fetch_url(url)
    article_text = trafilatura.extract(downloaded)
    return article_text or ""


def extract_article_text(url: str, min_chars: int = 300) -> str:
    text = " ".join((_extract_article_text(url) or "").split())
    return text if len(text) >= min_chars else ""

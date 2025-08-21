from newspaper import Article


def extract_with_newspaper(url: str, min_chars: int = 300) -> str:
    art = Article(url, language="en", fetch_images=False)
    art.download()
    art.parse()
    text = " ".join((art.text or "").split())
    return text if len(text) >= min_chars else ""


def extract_article_text(url: str) -> str:
    return extract_with_newspaper(url).strip()
from bs4 import BeautifulSoup
from app.core.config import session


def _extract_article_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return " ".join(soup.stripped_strings)


def _extract_article_trafilatura(url: str) -> str:
    import trafilatura
    downloaded = trafilatura.fetch_url(url)
    article_text = trafilatura.extract(downloaded)
    return article_text or ""


def extract_article_text(url: str) -> str:
    text = _extract_article_trafilatura(url)
    return text.strip()

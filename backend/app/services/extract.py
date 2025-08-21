from urllib.parse import urlparse, parse_qs

from bs4 import BeautifulSoup

from app.core.config import HTTP_TIMEOUT, session


def _unwrap_google_news(url: str) -> str:
    """Return publisher URL from Google News links."""
    try:
        qs = parse_qs(urlparse(url).query)
        if "url" in qs and qs["url"]:
            return qs["url"][0]
        if "news.google.com" in url and "/articles/" in url:
            r = session.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True)
            if r is not None and r.url and "news.google.com" not in r.url:
                return r.url
    except Exception:
        pass
    return url


def bs4_extract_text(potential_gn_url: str) -> tuple[str, str]:
    """Minimal extraction used by /extract and /news."""
    pub_url = _unwrap_google_news(potential_gn_url)
    r = session.get(pub_url, timeout=HTTP_TIMEOUT, allow_redirects=True)
    final_url = r.url or pub_url
    try:
        soup = BeautifulSoup(r.text, "lxml")
    except Exception:
        soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True) or ""
    return final_url, text

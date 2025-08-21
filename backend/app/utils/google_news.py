from urllib.parse import parse_qs, urlparse, urlunparse
from app.core.config import session


def _unwrap_google_news(url: str) -> str:
    qs = parse_qs(urlparse(url).query)
    return qs.get("url", [url])[0]


def _resolve_google_news_article(url: str) -> str:
    try:
        r = session.head(url, allow_redirects=True, timeout=10)
        return r.url
    except Exception:
        return url


def _normalize_amp(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    if path.endswith("/amp"):
        path = path[:-4]
    query = "&".join([q for q in parsed.query.split("&") if q and q != "amp=1"])
    parsed = parsed._replace(path=path, query=query)
    return urlunparse(parsed)

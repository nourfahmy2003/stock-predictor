from urllib.parse import parse_qs, urlparse, urlunparse
from datetime import datetime
from GoogleNews import GoogleNews
from app.core.config import session


def discover_links(query: str, days: int):
    gn = GoogleNews(lang="en", region="US", encode="utf-8", period=f"{days}d")
    gn.clear()
    gn.search(query)
    results = gn.result()
    out = []
    for r in results:
        published = r.get("datetime") or r.get("date")
        if isinstance(published, datetime):
            published = published.isoformat()
        out.append(
            {
                "title": r.get("title", ""),
                "link": r.get("link", ""),
                "source": r.get("media"),
                "published": published,
            }
        )
    return out

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

"""Text helpers."""


def _clean_title(s: str) -> str:
    """Return article title without trailing source separator."""
    return (s or "").split(" - ")[0].strip()


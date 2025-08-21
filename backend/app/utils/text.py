import re


def _preview(txt: str, n: int = 180) -> str:
    return re.sub(r"\s+", " ", (txt or "")[:n]).strip()


def _clean_title(s: str) -> str:
    return (s or "").split(" - ")[0].strip()


def _sentence_split(txt: str):
    return re.split(r'(?<=[\.!?])\s+', txt.strip())


def _summarize_first_n_sentences(txt: str, n: int, max_chars: int) -> str:
    if not txt:
        return ""
    sents = _sentence_split(txt)
    summary = " ".join(sents[:max(1, n)]).strip()
    if len(summary) > max_chars:
        summary = summary[:max_chars].rsplit(" ", 1)[0] + "…"
    return summary

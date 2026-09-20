"""RepoRadar — Query Understanding (Phase 3)
Uses Groq's free LLM to parse plain-English queries into a structured search:
    semantic query    (for the embedding layer)
    keywords          (for BM25)
    filters           (language, min-stars, recency) — applied after ranking

Usage:
    env -u PYTHONPATH .venv/Scripts/python.exe query_understand.py "a pdf invoice parser for gst in python"
    or imported by search.py for the unified pipeline
"""

import json
import os
import re
import sys
from datetime import date

from groq import Groq

# Model selection: fast + strong on free tier
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are the query-understanding engine for RepoRadar, a semantic GitHub repo search.
Your ONLY job: turn the user's plain-English request into a strict JSON object.

TODAY'S DATE IS {today}. Use it to interpret recency ("this year" → {year}-01-01, "last month" → the date 30 days ago, etc.).

Return EXACTLY this shape, no commentary, no markdown fences:
{
  "semantic": "short noun phrase for embedding search",
  "keywords": ["3-8 important search terms"],
  "filters": {
    "language": null or "python",
    "min_stars": 0,
    "updated_after": null or "YYYY-MM-DD"
  }
}

Rules:
- semantic: the core intent in 3-8 words, WITHOUT filters or filler. The thing they want to find.
- keywords: distinctive terms that MUST appear (names, tech, formats). Skip generic words (a, the, find, best, tool, app).
- filters.language: only set to a real programming language if explicitly stated (python, rust, go, typescript, c++, java, javascript). Else null.
- filters.min_stars: integer threshold ONLY if they ask for popularity ("popular", "well-known", "150+ stars", "most starred"). Else 1 (no floor) so long-tail repos surface.
- filters.updated_after: only if they mention recency ("last year", "recent", "updated 2025"). Else null.
- Never invent facts. Only put info present in the query.
""" 

_EXAMPLE = """Example — user says: "find me a popular pdf invoice parser for gst, built in python, updated this year"
Response:
{"semantic": "pdf invoice parser for gst", "keywords": ["pdf", "invoice", "parser", "gst"], "filters": {"language": "python", "min_stars": 500, "updated_after": "2025-01-01"}}"""

_LANG_ALIASES = {
    "python": "python", "py": "python",
    "rust": "rust", "rs": "rust",
    "javascript": "javascript", "js": "javascript", "node": "javascript",
    "typescript": "typescript", "ts": "typescript",
    "golang": "go", "go": "go", "golang": "go",
    "java": "java", "c++": "c++", "cpp": "c++", "c": "c",
    "ruby": "ruby", "php": "php", "c#": "c#", "csharp": "c#", ".net": "c#",
    "swift": "swift", "kotlin": "kotlin", "scala": "scala", "shell": "shell", "bash": "bash",
}

# Cheap local fallback filters that don't need the LLM
_LOCAL_FILTER = re.compile(
    r"(?P<lang>\b(python|py|rust|rs|javascript|js|node|typescript|ts|golang|go|"
    r"java|c\+\+|cpp|ruby|php|swift|kotlin|scala|bash)\b)"
)

_UPDATE_AFTER = {
    "month": 30, "last month": 30, "this month": 30,
    "last year": 365, "this year": 365, "recently": 180, "recent": 180,
    "new": 365,
}

_FLOAT_AWARE = re.compile(r"(\d+)\+?\s*stars?|\b(?:popular|well-?known|premium|most\s*starred)\b")


def _date_weeks_ago(days: int) -> str:
    from datetime import date, timedelta
    return (date.today() - timedelta(days=days)).isoformat()


def parse_query(query: str) -> dict:
    """Main entry: turn a plain-English query into a structured dict."""
    try:
        return _llm_parse(query)
    except Exception as e:
        # LLM down/rate-limited → degrade to local rule parser. Honest fallback.
        print(f"⚠️ LLM understanding failed ({type(e).__name__}: {e}) — using rules", file=sys.stderr, flush=True)
        return _local_parse(query)


def _llm_parse(query: str) -> dict:
    if not os.environ.get("GROQ_API_KEY"):
        raise RuntimeError("GROQ_API_KEY not set")
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    today = date.today()
    system = SYSTEM_PROMPT.replace("{today}", today.isoformat()).replace("{year}", str(today.year)) + "\n" + _EXAMPLE
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ],
        temperature=0,
        max_tokens=200,
    )
    raw = resp.choices[0].message.content.strip()
    # strip any accidental markdown fences
    raw = raw.strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    data = json.loads(raw)
    return {
        "semantic": data.get("semantic", query),
        "keywords": data.get("keywords", [query]),
        "filters": {
            "language": data.get("filters", {}).get("language"),
            "min_stars": int(data.get("filters", {}).get("min_stars", 1) or 1),
            "updated_after": data.get("filters", {}).get("updated_after"),
        },
        "source": "llm",
    }


def _local_parse(query: str) -> dict:
    """Rule-based fallback — detects common filters without any API call."""
    low = query.lower()

    # Language
    language = None
    m = re.search(r"\b(python|rust|javascript|typescript|go\b|golang|java|c\+\+|cpp|ruby|php|swift|kotlin)\b", low)
    if m:
        language = _LANG_ALIASES.get(m.group(1)) or m.group(1)

    # Min stars
    min_stars = 1
    m2 = re.search(r"(\d+)\+?\s*stars?", low)
    if m2:
        min_stars = int(m2.group(1))
    elif re.search(r"popular|well-?known|most\s*starred|highly\s*rated", low):
        min_stars = 500

    # Recency
    updated_after = None
    for phrase, days in _UPDATE_AFTER.items():
        if phrase in low:
            updated_after = _date_weeks_ago(days)
            break

    # semantic = strip filler words
    semantic = re.sub(
        r"\b(find|the|a|an|me|for|is|that|please|and|with|please|best|which|who|when)\b",
        " ", low).strip()
    return {
        "semantic": semantic or query,
        "keywords": [w for w in semantic.split() if len(w) > 2][:6],
        "filters": {"language": language, "min_stars": min_stars, "updated_after": updated_after},
        "source": "rules",
    }


def main():
    import sys
    q = " ".join(sys.argv[1:])
    if not q:
        print("Usage: python query_understand.py 'your query'")
        sys.exit(1)
    result = parse_query(q)
    print(f"📝 Parsed: \"{q}\"")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"→ source: {result['source']}")


if __name__ == "__main__":
    main()
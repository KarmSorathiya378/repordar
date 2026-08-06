"""RepoRadar — Search Core (Phase 2)
Local BM25 keyword search over crawled GitHub repos.

Reads crawler/data/repos.jsonl, builds an in-memory inverted index,
scores queries with BM25, and returns ranked repos with matched snippets.

Usage:
    python search_core.py "find me a pdf invoice parser for gst"
    python search_core.py --limit 10 --min-stars 50 "pdf invoice parser"
"""

import argparse
import json
import math
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent / "crawler" / "data"
OUT_FILE = DATA_DIR / "repos.jsonl"

# Small stopword set — frequent English words that carry no meaning for retrieval.
STOPWORDS = set("""
a an and are as at be but by for from has have how if in into is it its of on
or that the their them then there these they this to was we what when where
which who why will with you your not can do did does done i me my
""".split())

TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9_\-+.#]*")


def tokenize(text: str) -> list[str]:
    """Lowercase, split on non-alphanumeric, drop stopwords/short tokens."""
    toks = []
    for m in TOKEN_RE.finditer((text or "").lower()):
        t = m.group(0)
        if t in STOPWORDS or len(t) < 2:
            continue
        toks.append(t)
    return toks


class BM25Index:
    """In-memory Okapi BM25 index. No database — everything loaded from JSONL."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs: list[dict] = []          # original records
        self.doc_text: list[str] = []       # text (desc + readme) per doc
        self.doc_len: list[int] = []        # token counts
        self.avgdl = 0.0
        self.df: dict[str, int] = defaultdict(int)   # doc freq per term
        self.tf: list[dict[str, int]] = []           # term freq per doc
        self.N = 0

    def _build_text(self, rec: dict) -> str:
        """Combine searchable fields into one text block."""
        parts = []
        if rec.get("full_name"):
            parts.append(rec["full_name"])       # owner/name
        if rec.get("description"):
            parts.append(rec["description"])
        if rec.get("topics"):
            parts.append(" ".join(rec["topics"]))
        if rec.get("language"):
            parts.append(rec["language"])
        if rec.get("readme"):
            parts.append(rec["readme"])
        return "\n".join(parts)

    def load(self, path: Path = OUT_FILE, max_repos: int | None = None) -> int:
        self.docs, self.doc_text = [], []
        with open(path, encoding="utf-8") as f:
            for i, line in enumerate(f):
                if not line.strip():
                    continue
                rec = json.loads(line)
                self.docs.append(rec)
                self.doc_text.append(self._build_text(rec))
                if max_repos and len(self.docs) >= max_repos:
                    break
        self.N = len(self.docs)
        self._index()
        return self.N

    def _index(self):
        """Build term-frequency and document-frequency tables."""
        self.tf = [defaultdict(int) for _ in range(self.N)]
        total_len = 0
        for i, text in enumerate(self.doc_text):
            toks = tokenize(text)
            self.doc_len.append(len(toks))
            total_len += len(toks)
            for t in set(toks):
                self.df[t] += 1
            for t in toks:
                self.tf[i][t] += 1
        self.avgdl = total_len / self.N if self.N else 0.0
        self._doc_len = self.doc_len  # alias

    def _idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.N - df + 0.5) / (df + 0.5))

    def score_terms(self, terms: list[str]) -> list[tuple[float, int]]:
        """Return list of (score, doc_idx) for docs matching any term."""
        accum: dict[int, float] = defaultdict(float)
        for term in terms:
            idf = self._idf(term)
            if idf == 0:
                continue
            for doc, cnt in self.tf_entries(term):
                denom = cnt + self.k1 * (1 - self.b + self.b * self.doc_len[doc] / self.avgdl)
                accum[doc] += idf * (cnt * (self.k1 + 1)) / max(denom, 1e-9)
        return sorted(accum.items(), key=lambda kv: -kv[1])

    def tf_entries(self, term):
        """Yield (doc_idx, term_count) for docs containing term — from df/dump or full scan."""
        # Simple full scan: fine for tens of thousands of docs in memory.
        for i in range(self.N):
            c = self.tf[i].get(term)
            if c:
                yield i, c


def extract_snippet(text: str, terms: set[str], span: int = 160) -> str:
    """Find a window of text dense with matched terms."""
    tokens = [(t, pos) for pos, t in enumerate(TOKEN_RE.findall(text.lower()))]
    if not tokens:
        return ""
    # score token positions by how many query terms nearby
    best, best_score = 0, -1
    for pos in range(len(tokens)):
        score = 0
        for j in range(max(0, pos - 25), min(len(tokens), pos + 25)):
            if tokens[j][0] in terms:
                score += 1
        if score > best_score:
            best_score, best = score, pos
    if best_score <= 0:
        return ""
    start_char = tokens[best][1]
    # find char span
    chars = text.lower()
    seg = chars[max(0, start_char - span // 2): start_char + span]
    return "…" + seg + "…"


def highlight(text: str, terms: set[str]) -> str:
    """Wrap matched terms in **bold** for the snippet preview."""
    # Rebuild snippet then highlight
    def repl(m):
        if m.group(0) in terms or m.group(0).rstrip("s#+.·") in terms:
            return f"**{m.group(0)}**"
        return m.group(0)
    return re.sub(TOKEN_RE, repl, text)


def search(query: str, index: BM25, limit: int = 10, min_stars: int = 0) -> list[dict]:
    terms = set(tokenize(query))
    if not terms:
        return []
    scored = index.score_terms(list(terms))
    out = []
    for doc, score in scored:
        rec = index.docs[doc]
        if min_stars and rec.get("stars", 0) < min_stars:
            continue
        snippet = extract_snippet(index.doc_text[doc], terms)
        out.append({
            "full_name": rec["full_name"],
            "stars": rec.get("stars", 0),
            "language": rec.get("language"),
            "description": rec.get("description", ""),
            "score": round(score, 3),
            "matched_terms": sorted(terms & set(set(tokenize(index.doc_text[doc])))),
            "snippet": highlight(snippet, terms).replace("\n", " "),
        })
        if len(out) >= limit:
            break
    return out


def main():
    ap = argparse.ArgumentParser(description="RepoRadar local search")
    ap.add_argument("query", nargs="+", help="plain-English query")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--min-stars", type=int, default=0)
    args = ap.parse_args()

    t0 = time.time()
    idx = BM25Index()
    n = idx.load(OUT_FILE)
    print(f"📚 Indexed {n} repos in {time.time()-t0:.2f}s\n", file=sys.stderr)

    query = " ".join(args.query)
    results = search(query, idx, limit=args.limit, min_stars=args.min_stars)
    print(f"🔍 \"{query}\" — {len(results)} results\n")
    for r in results:
        print(f"#{r['score']:.1f}  {r['full_name']}  ⭐{r['stars']}  ({r['language'] or '?'})")
        if r["description"]:
            print(f"   {r['description'][:120]}")
        if r["snippet"]:
            print(f"   ↳ {r['snippet'][:200]}")
        print()


if __name__ == "__main__":
    main()
"""RepoRadar — Unified Search (Phase 3 final)
Pipeline: understand (Groq LLM) → BM25 + semantic embeddings → filters → RRF fusion.

The user's single entry point:
    env -u PYTHONPATH .venv/Scripts/python.exe search.py "natural language query"

Combines:
    - Query Understanding (query_understand.py): plain English → structured query
    - BM25 (search_core.py): exact word matches, great for names/technical terms
    - Semantic (embed.py): meaning matches, great for natural phrasing
    Uses Reciprocal Rank Fusion (RRF), then shows both scores + matched snippet.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from embed import NAMES_FILE, VECTORS_FILE, search as semantic_search
from query_understand import parse_query
from search_core import BM25Index, OUT_FILE, extract_snippet, highlight, tokenize


def rrf_fuse(bm25: list[dict], sem: list[dict], k: int = 60) -> list[dict]:
    """Reciprocal Rank Fusion — merge two ranked lists by rank position."""
    fused: dict[str, dict] = {}
    for rank, item in enumerate(bm25 + sem):
        name = item["full_name"]
        if name not in fused:
            fused[name] = {
                "full_name": name,
                "stars": item["stars"],
                "bm25_rank": None,
                "sem_rank": None,
            }
        # RRF score: 1/(k + rank) accumulates across both lists
        fused[name]["rrf"] = fused[name].get("rrf", 0.0) + 1.0 / (k + rank + 1)
        if len(bm25) and item in bm25:
            pass  # ranks captured below by separate pass
    # assign ranks cleanly
    for rank, item in enumerate(bm25):
        fused[item["full_name"]]["bm25_rank"] = rank + 1
        fused[item["full_name"]]["bm25_score"] = item["score"]
    for rank, item in enumerate(sem):
        fused[item["full_name"]]["sem_rank"] = rank + 1
        fused[item["full_name"]]["sem_score"] = item["score"]
    return sorted(fused.values(), key=lambda x: -x.get("rrf", 0))


def main():
    ap = argparse.ArgumentParser(description="RepoRadar unified search (understand + BM25 + semantic)")
    ap.add_argument("query", nargs="+")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--min-stars", type=int, default=None, help="override LLM filter")
    ap.add_argument("--raw", action="store_true", help="skip LLM understanding, search raw text")
    args = ap.parse_args()

    t0 = time.time()
    raw_query = " ".join(args.query)

    # 1) UNDERSTAND — parse plain English via Groq LLM
    if args.raw:
        parsed = {"semantic": raw_query, "keywords": [raw_query],
                  "filters": {"language": None, "min_stars": args.min_stars or 0, "updated_after": None},
                  "source": "manual"}
    else:
        parsed = parse_query(raw_query)

    filters = parsed["filters"]
    min_stars = args.min_stars if args.min_stars is not None else (filters.get("min_stars") or 0)
    language = filters.get("language")
    updated_after = filters.get("updated_after")

    semantic_q = parsed["semantic"] or raw_query
    manual_terms = (parsed["keywords"] or [semantic_q])
    query_terms_str = " ".join(manual_terms) if manual_terms else semantic_q

    print(f"🧩 Understood: semantic=\"{semantic_q}\" " +
          f"| lang={language or 'any'} | stars≥{min_stars} | updated≥{updated_after or 'any'}" +
          f" [src:{parsed['source']}]\n", file=sys.stderr)

    # 2) BM25 pass over the keyword terms the LLM extracted
    idx = BM25Index()
    idx.load(OUT_FILE)
    bm25 = []
    terms = set(tokenize(query_terms_str))
    if terms:
        for doc, score in idx.score_terms(list(terms)):
            rec = idx.docs[doc]
            if min_stars and rec.get("stars", 0) < min_stars:
                continue
            if language and (rec.get("language") or "").lower() != language.lower():
                continue
            if updated_after and rec.get("pushed_at", "")[:10] < updated_after:
                continue
            bm25.append({
                "full_name": rec["full_name"],
                "stars": rec.get("stars", 0),
                "score": round(score, 3),
            })
            if len(bm25) >= 50:
                break

    # 3) Semantic pass over the cleaned meaning
    sem = semantic_search(semantic_q, limit=50, min_stars=min_stars)
    # apply language + recency filters to semantic results too
    if language or updated_after:
        filtered_sem = []
        for s in sem:
            rec = next((r for r in idx.docs if r["full_name"] == s["full_name"]), None)
            if rec is None:
                continue
            if language and (rec.get("language") or "").lower() != language.lower():
                continue
            if updated_after and rec.get("pushed_at", "")[:10] < updated_after:
                continue
            filtered_sem.append(s)
        sem = filtered_sem

    # 4) Fuse
    fused = rrf_fuse(bm25, sem)
    results = fused[: args.limit]

    print(f"🔎 \"{raw_query}\" — {len(results)} results in {time.time()-t0:.1f}s\n")

    text_by_name = {idx.docs[i]["full_name"]: idx.doc_text[i] for i in range(idx.N)}

    for i, r in enumerate(results, 1):
        b25 = f"kw:{r.get('bm25_score', '—')}" if r.get("bm25_rank") else "kw:—"
        semv = f"sem:{r.get('sem_score', '—')}" if r.get("sem_rank") else "sem:—"
        print(f"{i:2}. {r['full_name']}  ⭐{r['stars']}  ({b25} {semv})")
        text = text_by_name.get(r["full_name"], "")
        snippet = extract_snippet(text, terms) if terms else ""
        if snippet:
            print(f"    ↳ {highlight(snippet, terms)[:180]}")
        print()


if __name__ == "__main__":
    main()
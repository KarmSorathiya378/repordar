"""RepoRadar — Unified Search (Phase 2 final)
Fuses BM25 keyword scores + semantic embedding scores into one ranked list.

The user's single entry point for Phase 2:
    env -u PYTHONPATH .venv/Scripts/python.exe search.py "natural language query"

Combines:
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
    ap = argparse.ArgumentParser(description="RepoRadar unified search (BM25 + semantic)")
    ap.add_argument("query", nargs="+")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--min-stars", type=int, default=0)
    args = ap.parse_args()

    t0 = time.time()
    query = " ".join(args.query)

    # BM25 pass
    idx = BM25Index()
    idx.load(OUT_FILE)
    bm25 = []
    terms = set(tokenize(query))
    if terms:
        for doc, score in idx.score_terms(list(terms)):
            rec = idx.docs[doc]
            if args.min_stars and rec.get("stars", 0) < args.min_stars:
                continue
            bm25.append({
                "full_name": rec["full_name"],
                "stars": rec.get("stars", 0),
                "score": round(score, 3),
            })
            if len(bm25) >= 50:  # top 50 for fusion
                break

    # Semantic pass
    sem = semantic_search(query, limit=50, min_stars=args.min_stars)

    # Fuse
    fused = rrf_fuse(bm25, sem)
    results = fused[: args.limit]

    print(f"🔎 \"{query}\" — {len(results)} results in {time.time()-t0:.1f}s\n")

    # Snippets from BM25 index for matched text
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
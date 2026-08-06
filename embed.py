"""RepoRadar — Embedding Pipeline (Phase 2 part 2)
Build a local semantic vector index over crawled READMEs, then search it.

Embedding model: all-MiniLM-L6-v2 (384-dim) via fastembed — free, offline,
runs on CPU. Vectors stored in numpy .npy files alongside repos.jsonl.

Steps:
    1. embed.py build   — embed all repo texts → vectors.npy
    2. embed.py search  — semantic search with cosine similarity
    3. fused with BM25 in search.py for the final ranker

Usage:
    env -u PYTHONPATH .venv/Scripts/python.exe embed.py build
    env -u PYTHONPATH .venv/Scripts/python.exe embed.py search "natural language query"
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

DATA_DIR = Path(__file__).parent / "crawler" / "data"
REPOS_FILE = DATA_DIR / "repos.jsonl"
VECTORS_FILE = DATA_DIR / "vectors.npy"
NAMES_FILE = DATA_DIR / "vector_names.jsonl"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH = 64  # embedding batch size


def load_repos() -> list[dict]:
    repos = []
    with open(REPOS_FILE, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                repos.append(json.loads(line))
    return repos


def repo_text(rec: dict) -> str:
    """Text we embed: the semantic core of the repo. Description + topics + README head."""
    parts = []
    if rec.get("description"):
        parts.append(rec["description"])
    if rec.get("topics"):
        parts.append("topics: " + " ".join(rec["topics"]))
    if rec.get("readme"):
        # README head up to ~1.5K chars — the part that says what the repo is
        parts.append(rec["readme"][:1500])
    return "\n".join(parts)


def build(max_repos: int | None = None) -> int:
    from fastembed import TextEmbedding

    repos = load_repos()
    if max_repos:
        repos = repos[:max_repos]
    print(f"📚 {len(repos)} repos to embed", file=sys.stderr)

    t0 = time.time()
    model = TextEmbedding(MODEL_NAME)
    print(f"🪄 Model ready ({time.time()-t0:.0f}s)", file=sys.stderr)

    texts = [repo_text(r) for r in repos]
    # Drop empty-text repos (shouldn't exist, but be safe)
    keep = [i for i, t in enumerate(texts) if t.strip()]
    texts = [texts[i] for i in keep]
    repos = [repos[i] for i in keep]

    t0 = time.time()
    all_vecs = []
    for i in range(0, len(texts), BATCH):
        batch = texts[i:i + BATCH]
        all_vecs.extend(model.embed(batch))
        done = min(i + BATCH, len(texts))
        if i % (BATCH * 4) == 0:
            print(f"  ⏳ {done}/{len(texts)} ({time.time()-t0:.0f}s)", file=sys.stderr)
    vecs = np.array(all_vecs, dtype=np.float32)

    np.save(VECTORS_FILE, vecs)
    with open(NAMES_FILE, "w", encoding="utf-8") as f:
        for rec in repos:
            f.write(json.dumps({"full_name": rec["full_name"], "stars": rec.get("stars", 0)}) + "\n")
    print(f"✅ Saved {vecs.shape} → {VECTORS_FILE}", file=sys.stderr)
    print(f"   {NAMES_FILE} ({len(repos)} names)", file=sys.stderr)
    print(f"   Time: {time.time()-t0:.0f}s total", file=sys.stderr)
    return len(repos)


def search(query: str, limit: int = 10, min_stars: int = 0) -> list[dict]:
    from fastembed import TextEmbedding

    if not VECTORS_FILE.exists():
        print("❌ No vectors yet — run: python embed.py build", file=sys.stderr)
        return []

    vecs = np.load(VECTORS_FILE)
    names = [json.loads(l) for l in open(NAMES_FILE, encoding="utf-8") if l.strip()]
    if len(names) != len(vecs):
        print(f"❌ Mismatch: {len(names)} names vs {len(vecs)} vectors — rebuild", file=sys.stderr)
        return []

    model = TextEmbedding(MODEL_NAME)
    qv = np.array(list(model.embed([query]))[0], dtype=np.float32)

    # cosine similarity = normalized dot product
    norms = np.linalg.norm(vecs, axis=1)
    qn = np.linalg.norm(qv)
    sims = (vecs @ qv) / (norms * qn + 1e-9)

    order = np.argsort(-sims)
    out = []
    for idx in order:
        rec = names[idx]
        if min_stars and rec["stars"] < min_stars:
            continue
        out.append({
            "full_name": rec["full_name"],
            "stars": rec["stars"],
            "score": round(float(sims[idx]), 4),
        })
        if len(out) >= limit:
            break
    return out


def main():
    ap = argparse.ArgumentParser(description="RepoRadar embeddings")
    sub = ap.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="embed all repos → vectors.npy")
    b.add_argument("--max", type=int, default=None)

    s = sub.add_parser("search", help="semantic search")
    s.add_argument("query", nargs="+")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--min-stars", type=int, default=0)

    args = ap.parse_args()
    if args.cmd == "build":
        build(max_repos=args.max)
    else:
        t0 = time.time()
        results = search(" ".join(args.query), limit=args.limit, min_stars=args.min_stars)
        print(f"🧠 Semantic search — {len(results)} results in {time.time()-t0:.1f}s\n")
        for r in results:
            print(f"#{r['score']:.3f}  {r['full_name']}  ⭐{r['stars']}")


if __name__ == "__main__":
    main()
"""RepoRadar — Embedding Pipeline (Phase 2 part 2)
Build a local semantic vector index over crawled READMEs, then search it.

Embedding model: all-MiniLM-L6-v2 (384-dim) via fastembed — free, offline,
runs on CPU. Vectors stored in numpy .npy files alongside repos.jsonl.

Incremental Indexing:
    - Automatically detects previously embedded repos in vector_names.jsonl.
    - Encodes ONLY brand-new repos and appends them to vectors.npy.
    - Speeds up index updates from ~20 minutes down to ~3-5 seconds!

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

# Force UTF-8 encoding on standard streams for cross-platform unicode safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = Path(__file__).parent / "crawler" / "data"
REPOS_FILE = DATA_DIR / "repos.jsonl"
VECTORS_FILE = DATA_DIR / "vectors.npy"
NAMES_FILE = DATA_DIR / "vector_names.jsonl"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH = 64  # embedding batch size


def load_repos() -> list[dict]:
    repos = []
    if not REPOS_FILE.exists():
        return repos
    with open(REPOS_FILE, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    repos.append(json.loads(line))
                except Exception:
                    continue
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

    all_repos = load_repos()
    if max_repos:
        all_repos = all_repos[:max_repos]

    # Load existing names and vectors if present
    existing_names = set()
    existing_vecs = None
    if NAMES_FILE.exists() and VECTORS_FILE.exists():
        try:
            with open(NAMES_FILE, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        existing_names.add(str(json.loads(line).get("full_name")))
            existing_vecs = np.load(VECTORS_FILE)
            if len(existing_names) != len(existing_vecs):
                print(f"⚠️ Mismatch ({len(existing_names)} names vs {len(existing_vecs)} vecs). Rebuilding full index...", flush=True)
                existing_names = set()
                existing_vecs = None
        except Exception as e:
            print(f"⚠️ Could not load existing vector index ({e}). Rebuilding full index...", flush=True)
            existing_names = set()
            existing_vecs = None

    # Filter out repos that are already embedded
    new_repos = [r for r in all_repos if r.get("full_name") not in existing_names]

    if not new_repos:
        print(f"✅ Vector index is 100% up to date ({len(all_repos)} repos already embedded). Zero new repos to process.", flush=True)
        return len(all_repos)

    print(f"⚡ Incremental Indexing: {len(new_repos)} NEW repos to embed (out of {len(all_repos)} total repos)", flush=True)

    t0 = time.time()
    model = TextEmbedding(MODEL_NAME)
    print(f"🪄 Model ready ({time.time()-t0:.1f}s)", flush=True)

    texts = [repo_text(r) for r in new_repos]
    keep = [i for i, t in enumerate(texts) if t.strip()]
    texts = [texts[i] for i in keep]
    new_repos = [new_repos[i] for i in keep]

    if not texts:
        print("⚠️ No valid text found in new repos.", flush=True)
        return len(all_repos)

    t0 = time.time()
    new_vecs = []
    for i in range(0, len(texts), BATCH):
        batch = texts[i:i + BATCH]
        new_vecs.extend(model.embed(batch))
        done = min(i + BATCH, len(texts))
        if i % (BATCH * 4) == 0:
            print(f"  ⏳ Embedded {done}/{len(texts)} new repos ({time.time()-t0:.1f}s)", flush=True)

    new_vec_arr = np.array(new_vecs, dtype=np.float32)

    # Combine existing + new vectors
    if existing_vecs is not None and len(existing_vecs) > 0:
        final_vecs = np.vstack([existing_vecs, new_vec_arr])
    else:
        final_vecs = new_vec_arr

    # Save vectors
    np.save(VECTORS_FILE, final_vecs)

    # Append new repo names to vector_names.jsonl
    mode = "a" if existing_names else "w"
    with open(NAMES_FILE, mode, encoding="utf-8") as f:
        for rec in new_repos:
            f.write(json.dumps({"full_name": rec["full_name"], "stars": rec.get("stars", 0)}) + "\n")

    print(f"✅ Saved updated index {final_vecs.shape} → {VECTORS_FILE}", flush=True)
    print(f"   Total Indexed: {len(final_vecs)} repos in {time.time()-t0:.1f}s!", flush=True)
    return len(final_vecs)


def search(query: str, limit: int = 10, min_stars: int = 0) -> list[dict]:
    from fastembed import TextEmbedding

    if not VECTORS_FILE.exists():
        print("❌ No vectors yet — run: python embed.py build", flush=True)
        return []

    vecs = np.load(VECTORS_FILE)
    names = [json.loads(l) for l in open(NAMES_FILE, encoding="utf-8") if l.strip()]
    if len(names) != len(vecs):
        print(f"❌ Mismatch: {len(names)} names vs {len(vecs)} vectors — rebuild", flush=True)
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
            "score": float(sims[idx]),
        })
        if len(out) >= limit:
            break
    return out


def main():
    parser = argparse.ArgumentParser(description="RepoRadar Vector Embeddings & Semantic Search")
    sub = parser.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="Build semantic vector index")
    b.add_argument("--max", type=int, help="Limit number of repos to process")

    s = sub.add_parser("search", help="Search the vector index")
    s.add_argument("query", help="Search query")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--min-stars", type=int, default=0)

    args = parser.parse_args()
    if args.cmd == "build":
        build(max_repos=args.max)
    elif args.cmd == "search":
        results = search(args.query, limit=args.limit, min_stars=args.min_stars)
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

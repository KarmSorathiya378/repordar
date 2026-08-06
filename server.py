"""RepoRadar — Persistent Search Server (Phase 3/4 bridge)
Loads the BM25 index + embedding model + vectors ONCE, then serves every
query in under a second. This is also the API the Phase 4 web app will call.

Start:
    env -u PYTHONPATH .venv/Scripts/python.exe server.py            # port 8123
    (rebuild vectors first if repos.jsonl changed: embed.py build)

Query:
    curl "http://localhost:8123/search?q=pdf+invoice+parser+python&limit=5"

Uses stdlib http.server — zero extra dependencies.
"""

import argparse
import json
import os
import sys
import threading
import time
import datetime
from collections import Counter, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))


def _load_env():
    """Load repo-local .env into os.environ (without clobbering existing)."""
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        return
    import re
    for line in env_file.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$", line)
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


_load_env()

from embed import NAMES_FILE, VECTORS_FILE, MODEL_NAME, search as semantic_search_raw
from query_understand import parse_query
from search_core import BM25Index, OUT_FILE, extract_snippet, highlight, tokenize


class RepoRadarEngine:
    """Loads everything once; serves many queries."""

    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self._skip_llm = False
        self.log(f"🧠 Loading engine...")

        # 1) BM25 index
        t0 = time.time()
        self.idx = BM25Index()
        self.idx.load(OUT_FILE)
        self.log(f"   BM25 index: {self.idx.N} repos ({time.time()-t0:.1f}s)")

        # 2) Embedding model (load once)
        t0 = time.time()
        from fastembed import TextEmbedding
        self.embed_model = TextEmbedding(MODEL_NAME)
        self.log(f"   Embedding model ready ({time.time()-t0:.1f}s)")

        # 3) Vectors + names
        t0 = time.time()
        self.vecs = np.load(VECTORS_FILE)
        self.norms = np.linalg.norm(self.vecs, axis=1)
        self.names = [json.loads(l) for l in open(NAMES_FILE, encoding="utf-8") if l.strip()]
        self.log(f"   Vectors: {self.vecs.shape} ({time.time()-t0:.2f}s)")

        # text map for snippets
        self.text_by_name = {self.idx.docs[i]["full_name"]: self.idx.doc_text[i]
                             for i in range(self.idx.N)}
        self.idx.docs_by_name = {d["full_name"]: d for d in self.idx.docs}

        # query log: recent queries + counts (in-memory, lightweight)
        self.query_log: deque = deque(maxlen=200)
        self.query_counter: Counter = Counter()
        self.start_time = time.time()
        self.log("✅ Engine ready.")

    def log(self, msg):
        if self.verbose:
            print(msg, file=sys.stderr, flush=True)

    def _semantic(self, query: str, limit: int = 50, min_stars: int = 0) -> list[dict]:
        qv = np.array(list(self.embed_model.embed([query]))[0], dtype=np.float32)
        qn = np.linalg.norm(qv)
        sims = (self.vecs @ qv) / (self.norms * qn + 1e-9)
        order = np.argsort(-sims)
        out = []
        for idx in order:
            rec = self.names[idx]
            if min_stars and rec["stars"] < min_stars:
                continue
            out.append({"full_name": rec["full_name"], "stars": rec["stars"],
                        "score": round(float(sims[idx]), 4)})
            if len(out) >= limit:
                break
        return out

    def search(self, query: str, limit: int = 10, min_stars: int | None = None) -> dict:
        t0 = time.time()

        # log the query for stats/observability
        self.query_counter[query.lower()] += 1
        self.query_log.append({
            "q": query, "ts": datetime.datetime.now().isoformat(timespec="seconds"),
            "limit": limit, "source": "?", "elapsed": None,
        })
        self.query_log[-1]["source"] = "pending"

        # 1) UNDERSTAND (Groq LLM; falls back to rules if down)
        if not self._skip_llm:
            parsed = parse_query(query)
        else:
            parsed = {"semantic": query, "keywords": [query],
                      "filters": {"language": None, "min_stars": min_stars or 0, "updated_after": None},
                      "source": "manual"}

        filters = parsed["filters"]
        self.query_log[-1]["source"] = parsed["source"]
        eff_stars = min_stars if min_stars is not None else (filters.get("min_stars") or 0)
        language = filters.get("language")
        updated_after = filters.get("updated_after")

        semantic_q = parsed["semantic"] or query
        keyword_str = " ".join(parsed["keywords"] or [semantic_q])
        terms = set(tokenize(keyword_str))

        # 2) BM25
        bm25_results = []
        if terms:
            for doc, score in self.idx.score_terms(list(terms)):
                rec = self.idx.docs[doc]
                if eff_stars and rec.get("stars", 0) < eff_stars:
                    continue
                if language and (rec.get("language") or "").lower() != language.lower():
                    continue
                if updated_after and rec.get("pushed_at", "")[:10] < updated_after:
                    continue
                bm25_results.append({"full_name": rec["full_name"], "stars": rec.get("stars", 0),
                                     "score": round(score, 3)})
                if len(bm25_results) >= 50:
                    break

        # 3) Semantic
        sem_results = self._semantic(semantic_q, limit=50, min_stars=eff_stars)
        if language or updated_after:
            filtered = []
            for s in sem_results:
                rec = self.idx.docs_by_name.get(s["full_name"])
                if rec is None:
                    continue
                if language and (rec.get("language") or "").lower() != language.lower():
                    continue
                if updated_after and rec.get("pushed_at", "")[:10] < updated_after:
                    continue
                filtered.append(s)
            sem_results = filtered

        # 4) Fuse (Reciprocal Rank Fusion)
        k = 60
        fused = {}
        for rank, item in enumerate(bm25_results + sem_results):
            name = item["full_name"]
            if name not in fused:
                fused[name] = {"full_name": name, "stars": item["stars"],
                               "bm25": None, "sem": None, "rrf": 0.0}
            fused[name]["rrf"] += 1.0 / (k + rank + 1)
        for rank, item in enumerate(bm25_results):
            fused[item["full_name"]]["bm25"] = item["score"]
        for rank, item in enumerate(sem_results):
            if item["full_name"] in fused:
                fused[item["full_name"]]["sem"] = item["score"]
        ranked = sorted(fused.values(), key=lambda x: -x["rrf"])[:limit]

        # 5) snippets + proof
        out = []
        for r in ranked:
            text = self.text_by_name.get(r["full_name"], "")
            snippet = extract_snippet(text, terms) if terms else ""
            rec = self.idx.docs_by_name.get(r["full_name"], {})
            out.append({
                "full_name": r["full_name"],
                "stars": r["stars"],
                "language": rec.get("language"),
                "description": rec.get("description", ""),
                "bm25_score": r["bm25"],
                "sem_score": r["sem"],
                "rrf": round(r["rrf"], 4),
                "snippet": highlight(snippet, terms).replace("\n", " ") if snippet else "",
                "url": f"https://github.com/{r['full_name']}",
            })

        elapsed = round((time.time() - t0) * 1000)
        self.query_log[-1]["elapsed"] = elapsed

        return {
            "query": query,
            "understood": {"semantic": semantic_q, "keywords": parsed["keywords"],
                           "filters": filters, "source": parsed["source"]},
            "results": out,
            "elapsed_ms": elapsed,
        }


_engine = None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silence default logging
        pass

    def do_GET(self):
        from urllib.parse import urlparse
        parsed = urlparse(self.path)

        # Serve the static web UI
        if parsed.path in ("/", "/index.html"):
            self._serve_static("index.html")
            return
        if parsed.path.startswith("/static/"):
            self._serve_static(parsed.path[len("/static/"):])
            return

        if parsed.path in ("/api/health", "/api/health"):
            self._json({"status": "ok", "repos": _engine.idx.N})
            return
        if parsed.path == "/api/stats":
            eng = _engine
            total = sum(eng.query_counter.values())
            top = eng.query_counter.most_common(15)
            self._json({
                "repos": eng.idx.N,
                "uptime_sec": round(time.time() - eng.start_time),
                "total_queries": total,
                "unique_queries": len(eng.query_counter),
                "top_queries": [{"q": q, "count": c} for q, c in top],
                "recent": list(eng.query_log),
            })
            return
        if parsed.path == "/api/search":
            qs = parse_qs(parsed.query)
            q = qs.get("q", [""])[0]
            if not q:
                self._json({"error": "missing ?q="}, status=400)
                return
            limit = int(qs.get("limit", ["10"])[0])
            try:
                result = _engine.search(q, limit=limit)
                self._json(result)
            except Exception as e:
                self._json({"error": f"{type(e).__name__}: {e}"}, status=500)
            return
        self._json({"error": "not found"}, status=404)

    def _serve_static(self, name):
        import mimetypes
        root = Path(__file__).parent / "web"
        # guard against path traversal
        safe = Path(name).name if ".." in name else name
        fp = (root / safe)
        if not fp.exists() or not fp.is_file():
            self._json({"error": "not found"}, status=404)
            return
        body = fp.read_bytes()
        ctype = mimetypes.guess_type(fp.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")  # allow the web app
        self.end_headers()
        self.wfile.write(body)


def main():
    ap = argparse.ArgumentParser(description="RepoRadar persistent search server")
    ap.add_argument("--port", type=int, default=8123)
    ap.add_argument("--no-llm", action="store_true", help="skip Groq (faster, keyword-only understanding)")
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()

    global _engine
    _engine = RepoRadarEngine()
    _engine._skip_llm = args.no_llm

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"🚀 RepoRadar server on http://{args.host}:{args.port}/search?q=...", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.", file=sys.stderr)


if __name__ == "__main__":
    main()
<p align="center">
  <img width="48" src="web/public/favicon.svg" alt="RepoRadar" />
</p>

<h1 align="center">RepoRadar</h1>

<p align="center">
  <b>Google for repositories.</b> Type a problem in plain English, get the GitHub repos that actually solve it — ranked with proof.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/local--first-4f46e5" alt="local-first" />
  <img src="https://img.shields.io/badge/Python-3.11-blue" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
</p>

---

## The problem

Keyword search finds repos whose *name* or *README* happens to repeat the words you typed. It fails at the thing people actually do: **describing a problem in plain English.** So the perfect — but obscure, low-star — library that already solves it stays hidden, drowned out by famous-but-wrong results.

## What RepoRadar does differently

RepoRadar reads the **actual contents** of every README, then matches your query two ways and fuses the results:

| Engine | What it catches | Example |
|--------|----------------|---------|
| 🔤 **BM25** (keyword) | Your exact words | typing "banana game" |
| 🧠 **Semantic** (embeddings) | *Meaning*, even with different wording | "a game where I raise and level up cute animal characters" → the Banana Level Up repo |

A small LLM first converts your plain-English query into structured search filters ("understand" → language, min stars, recency), so you can say *"pdf invoice parser made in python"* and it figures out the rest.

**Every result shows why it ranked** — the matched snippet from the README, which engines matched, and a similarity meter. No black box.

## Architecture

**Local-first and $0.** No database server, no API fees — everything runs on your machine.

```
crawler.py          GitHub API crawler → repos.jsonl (rate-limit aware)
search_core.py      BM25 keyword index
embed.py            Semantic embeddings (all-MiniLM-L6-v2, local ONNX)
             ┌────────────────────────────────────────┐
query_understand.py │ LLM (Groq free tier) → structured filters
                    │  (falls back to local rules if no key)
search (fused)      RRF merge: BM25 + semantic → ranked results
server.py           Persistent HTTP server (+ serves the React UI)
web/                React 19 + Vite + Tailwind + shadcn/ui (light)
```

## Run it

Windows:

```bat
start.bat
```

It kills stale servers, sets up the venv + dependencies, builds semantic vectors (if missing), builds the React frontend, and opens `http://localhost:8123`.

Or manually:

```bash
# 1. Python dependencies
python -m venv .venv
.venv/Scripts/python -m pip install fastembed groq numpy

# 2. Crawl repos (optional — seed several hundred repos)
# 3. Build semantic vectors (one-time, ~10 min on 6k repos)
.venv/Scripts/python embed.py build

# 4. Run the server
.venv/Scripts/python server.py --port 8123
# → http://localhost:8123
```

> Optional: set `GROQ_API_KEY` in `.env` for LLM query understanding. Without it, it runs on local matching rules (source: `rules` instead of `llm`).

## API

```
GET /api/health      → { status, repos }
GET /api/search?q=…  → { query, understood, results[], elapsed_ms }
GET /api/stats       → query log + counters
```

## Status

- ✅ Crawler — GitHub API, rate-limit aware, resume-able
- ✅ Search core — BM25 + semantic embeddings, fused (RRF)
- ✅ Query understanding — Groq LLM → structured filters (rules fallback)
- ✅ Web UI — React 19 + shadcn/ui, light professional theme
- ✅ Persistent server — sub-second responses, query logging
- 🚧 Scale the index — currently ~6k repos, targeting 100k
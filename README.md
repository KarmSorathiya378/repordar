# RepoRadar

**Google for repos.** Type a problem in plain English, get the GitHub repos that actually solve it — ranked with proof.

## Stack
- **Crawler:** Python (GitHub API, rate-limit aware)
- **Database:** Supabase free (Postgres + pgvector)
- **App:** Next.js on Vercel free tier
- **Query understanding:** Groq free tier
- **Embeddings:** NVIDIA API / local model
- **Reranker:** local model (bge-reranker)

## Phases
1. Crawler — 100K repos with READMEs
2. Search core — BM25 + embeddings + reranker
3. Query understanding — plain English → structured search
4. Web app — Next.js UI on Vercel
5. Trust & polish — feedback, methodology page
6. Launch — HN, Reddit, iterate

## Status
🚧 Phase 1 in progress.

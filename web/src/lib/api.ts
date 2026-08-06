export interface SearchFilters {
  language?: string
  min_stars?: number
  updated_after?: string
}

export interface Understood {
  semantic: string
  keywords: string[]
  filters: SearchFilters
  source: string
}

export interface RepoResult {
  full_name: string
  stars: number
  language: string | null
  description: string
  topics: string[]
  bm25_score: number | null
  sem_score: number | null
  rrf: number
  snippet: string
  url: string
}

export interface SearchResponse {
  query: string
  understood: Understood
  results: RepoResult[]
  elapsed_ms: number
}

export interface HealthResponse {
  status: string
  repos: number
}

export interface StatsResponse {
  repos: number
  uptime_sec: number
  total_queries: number
  unique_queries: number
  top_queries: { q: string; count: number }[]
  recent: { q: string; source: string; elapsed: number }[]
}

const BASE = '' // same origin in prod; vite dev proxies /api

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export function apiSearch(q: string, limit = 10): Promise<SearchResponse> {
  return get(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`)
}

export function apiHealth(): Promise<HealthResponse> {
  return get('/api/health')
}

export function apiStats(): Promise<StatsResponse> {
  return get('/api/stats')
}
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
  forks?: number
  language: string | null
  description: string
  topics: string[]
  license?: string | null
  pushed_at?: string | null
  bm25_score: number | null
  sem_score: number | null
  rrf: number
  snippet: string
  url: string
}

export interface RepoDetail {
  id?: number
  full_name: string
  description: string
  stars: number
  forks: number
  language: string | null
  topics: string[]
  license: string | null
  pushed_at: string | null
  readme: string
  url: string
}

export interface SearchOptions {
  limit?: number
  min_stars?: number
  language?: string
  sort?: string
}

const BASE = '' // same origin in prod; vite dev proxies /api

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
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

export interface PopularRepo {
  full_name: string
  stars: number
  description: string
  language: string | null
}

export interface PopularLanguage {
  language: string
  count: number
  pct: number
}

export interface PopularResponse {
  total: number
  popular: PopularRepo[]
  languages: PopularLanguage[]
}

export function apiSearch(q: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const params = new URLSearchParams()
  params.set('q', q)
  if (options.limit) params.set('limit', String(options.limit))
  if (options.min_stars) params.set('min_stars', String(options.min_stars))
  if (options.language) params.set('language', options.language)
  if (options.sort) params.set('sort', options.sort)
  return get(`/api/search?${params.toString()}`)
}

export function apiRepoDetail(name: string): Promise<RepoDetail> {
  return get(`/api/repo?name=${encodeURIComponent(name)}`)
}

export function apiHealth(): Promise<HealthResponse> {
  return get('/api/health')
}

export function apiStats(): Promise<StatsResponse> {
  return get('/api/stats')
}

export function apiPopular(): Promise<PopularResponse> {
  return get('/api/popular')
}
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Star, ExternalLink, Radar, Loader2, ArrowRight, GitBranch } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { apiHealth, apiSearch, type RepoResult, type SearchResponse, type Understood } from '@/lib/api'

const EXAMPLES = [
  { emoji: '🍌', label: 'banana game', q: 'video game where i raise and level up cute animal characters' },
  { emoji: '🔑', label: 'api key manager', q: 'secure api key management for ai agents' },
  { emoji: '🖥️', label: 'terminal multiplexer', q: 'terminal multiplexer alternative to tmux' },
  { emoji: '🗄️', label: 'kv database', q: 'lightweight embedded key value database in go' },
  { emoji: '🖼️', label: 'remove bg', q: 'remove background from photos programmatically' },
]

function renderSnippet(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<mark>$1</mark>')
}

function StarCount({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-amber-500 font-medium">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {n.toLocaleString()}
    </span>
  )
}

function UnderstoodBar({ u, elapsed }: { u: Understood; elapsed: number }) {
  if (!u?.semantic && !u?.filters?.language) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Understood</span>
      {u.semantic && (
        <Badge variant="accent" className="font-normal">{u.semantic}</Badge>
      )}
      {u.filters?.language && <Badge variant="outline">lang: {u.filters.language}</Badge>}
      {!!u.filters?.min_stars && <Badge variant="outline">★ ≥ {u.filters.min_stars}</Badge>}
      {u.filters?.updated_after && <Badge variant="outline">updated ≥ {u.filters.updated_after}</Badge>}
      <span className="ml-auto font-mono text-xs text-muted-foreground">
        {u.source === 'llm' ? '✨ llm' : 'rules'} · {elapsed} ms
      </span>
    </div>
  )
}

function RepoCard({ r, rank }: { r: RepoResult; rank: number }) {
  const sem = r.sem_score ?? 0
  const hasWords = r.bm25_score != null
  const hasMeaning = r.sem_score != null
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-right font-mono text-sm text-muted-foreground">{rank}</span>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-semibold text-foreground hover:text-primary hover:underline"
          >
            {r.full_name}
          </a>
          {r.language && (
            <Badge variant="secondary" className="hidden shrink-0 font-mono text-[11px] sm:inline-flex">
              {r.language}
            </Badge>
          )}
          <span className="ml-auto shrink-0"><StarCount n={r.stars} /></span>
        </div>

        {r.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
        )}

        {r.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.topics.map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-[11px] font-normal text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {r.snippet && (
          <div
            className="mt-3 rounded-md border-l-2 border-primary bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground break-words"
            dangerouslySetInnerHTML={{ __html: renderSnippet(r.snippet) }}
          />
        )}

        <div className="mt-4 flex items-center gap-2 text-xs">
          <Badge variant={hasWords ? 'accent' : 'outline'} className="uppercase">
            words
          </Badge>
          <Badge variant={hasMeaning ? 'accent' : 'outline'} className="uppercase">
            meaning
          </Badge>
          <span className="ml-auto flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.round(sem * 100)}%` }}
              />
            </span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              open <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function App() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<SearchResponse | null>(null)
  const [error, setError] = useState('')
  const [repoCount, setRepoCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiHealth().then((h) => setRepoCount(h.repos)).catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' && document.activeElement !== inputRef.current) ||
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const run = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    setResp(null)
    try {
      const d = await apiSearch(trimmed)
      setResp(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [loading])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Radar className="h-4 w-4" />
            </span>
            RepoRadar
          </div>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#results" className="hover:text-foreground">Results</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {repoCount ? `${repoCount.toLocaleString()} repos` : '…'}
            </span>
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">/</kbd>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <GitBranch className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-10 text-center sm:pt-24">
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live · {repoCount ? `${repoCount.toLocaleString()} repos indexed` : 'indexing…'}
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Find the repo that <span className="text-primary">actually</span> solves your problem
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Describe what you're building in plain English. RepoRadar reads the contents of every README — so the hidden, low-star project you need surfaces with the famous ones.
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/60">
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run(q)}
              placeholder="Describe what you want to build…"
              className="h-10 border-0 shadow-none focus-visible:ring-0"
            />
            <Button onClick={() => run(q)} disabled={loading} className="h-10 gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Scanning' : 'Search'}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Try</span>
            {EXAMPLES.map((ex) => (
              <Button key={ex.q} variant="outline" size="sm" onClick={() => { setQ(ex.q); run(ex.q) }}>
                {ex.emoji} {ex.label}
              </Button>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t pt-10">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { n: '01', t: 'Describe the problem', d: 'Type what you\u2019re building in plain English. No keywords needed — say it like you\u2019d ask a colleague.' },
              { n: '02', t: 'We read the READMEs', d: 'An LLM extracts what you mean, then we search the actual contents of every indexed README — keywords and meaning.' },
              { n: '03', t: 'Ranked with proof', d: 'Fused keyword + semantic scores, with the matched snippet shown so you can see why each repo ranked.' },
            ].map((s, i) => (
              <div key={s.n} className="relative flex gap-4 sm:block">
                <span className="font-mono text-xs text-primary">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
                {i < 2 && <ArrowRight className="absolute -right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/40 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        {/* Results */}
        <section id="results" className="scroll-mt-20">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Scanning the radar…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          {resp && !loading && (
            <div className="mt-8">
              <UnderstoodBar u={resp.understood} elapsed={resp.elapsed_ms} />

              {resp.results.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <div className="text-3xl">📡</div>
                  <p className="mt-3 font-medium text-foreground">Nothing on the radar for that one</p>
                  <p className="mt-1 text-sm">Try different words, or describe the problem more broadly.</p>
                </div>
              ) : (
                <div className="mt-4 flex items-baseline gap-2">
                  <h2 className="font-semibold">
                    {resp.results.length} result{resp.results.length > 1 ? 's' : ''}
                  </h2>
                  <span className="text-sm text-muted-foreground">best match on top</span>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {resp.results.map((r, i) => <RepoCard key={r.full_name} r={r} rank={i + 1} />)}
              </div>
            </div>
          )}
        </section>

        <Separator className="my-10" />

        <footer className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>RepoRadar · local-first search over {repoCount?.toLocaleString() ?? '…'} repos</span>
          <span className="font-mono">BM25 + embeddings + LLM understanding</span>
        </footer>
      </main>
    </div>
  )
}

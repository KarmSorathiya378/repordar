import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Lock, Globe, Sparkles, Search, Star, ExternalLink, Radar, Loader2, ArrowRight, GitBranch, Shield, Zap, Database, Activity,
  BookOpen, Layers, MessageSquareText, Check, X, ChevronDown
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  apiHealth, apiSearch, apiStats, apiPopular,
  type RepoResult, type SearchResponse, type Understood, type StatsResponse, type PopularResponse
} from '@/lib/api'

// ── ReactBits components ─────────────────────
import Particles from '@/components/reactbits/Particles'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import Magnet from '@/components/reactbits/Magnet'
import SplitText from '@/components/reactbits/SplitText'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'

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

/* ── error boundary so WebGL fails never kill the app ── */
class CanvasSafe extends Component<{ children: ReactNode }, { ok: boolean }> {
  state = { ok: true }
  static getDerivedStateFromError() { return { ok: false } }
  render() { return this.state.ok ? this.props.children : null }
}

/* ── count-up number ─────────────────────────── */
function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])
  return val
}

function fmtUptime(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600) % 24
  const d = Math.floor(sec / 86400)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StarCount({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-amber-500 font-medium">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {n.toLocaleString()}
    </span>
  )
}

function langColor(l: string | null) {
  switch ((l || '').toLowerCase()) {
    case 'python': return '#3572A5'
    case 'javascript': return '#f1e05a'
    case 'typescript': return '#3178c6'
    case 'go': return '#00ADD8'
    case 'rust': return '#dea584'
    case 'java': return '#b07219'
    case 'c': return '#555555'
    case 'c++': return '#f34b7d'
    case 'c#': return '#178600'
    default: return '#8a8fa3'
  }
}

/* ── hero — WebGL particle field (brand purple) ── */
function HeroField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="radar-glow absolute inset-x-0 top-[-12rem] h-[38rem]" />
      <div className="absolute inset-0 opacity-70">
        <CanvasSafe>
          <Particles
            particleColors={['#533afd', '#7c6cff', '#b3a7ff']}
            particleCount={90}
            particleSpread={12}
            speed={0.35}
            particleBaseSize={110}
            sizeRandomness={1.2}
            alphaParticles
            moveParticlesOnHover
            particleHoverFactor={0.6}
            pixelRatio={0.9}
          />
        </CanvasSafe>
      </div>
    </div>
  )
}

/* ── live radar: real top repos + language profile ── */
function RadarPanel({ data, total }: { data: PopularResponse | null; total: number | null }) {
  const blips = useMemo(() => {
    if (!data) return []
    return data.popular.slice(0, 6).map((p, i) => {
      let seed = 0
      for (const c of p.full_name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      const ang = (seed % 360) * (Math.PI / 180)
      const r = 24 + ((seed >> 3) % 52)
      return { ...p, x: 100 + r * Math.cos(ang), y: 100 + r * Math.sin(ang), delay: i * 0.35 }
    })
  }, [data])

  if (!data) {
    return (
      <div className="mx-auto mt-12 max-w-3xl animate-fade-up">
        <div className="h-64 overflow-hidden rounded-2xl border">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-12 max-w-3xl animate-fade-up">
      <SpotlightCard className="overflow-hidden shadow-card" spotlightColor="rgba(83, 58, 253, 0.10)">
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live radar · top repos right now
          </span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {data.total.toLocaleString()} indexed
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
          {/* radar sweep */}
          <div className="relative flex items-center justify-center border-b p-4 sm:border-b-0 sm:border-r">
            <svg viewBox="0 0 200 200" className="h-44 w-44">
              <defs>
                <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#533afd" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#533afd" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[45, 80, 115].map((r) => (
                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#e5edf5" strokeWidth="1" />
              ))}
              <line x1="20" y1="100" x2="180" y2="100" stroke="#e5edf5" strokeWidth="0.5" />
              <line x1="100" y1="20" x2="100" y2="180" stroke="#e5edf5" strokeWidth="0.5" />
              <g className="animate-radar-spin" style={{ transformOrigin: '100px 100px' }}>
                <path d="M100 100 L100 10 A90 90 0 0 1 184 139 Z" fill="url(#sweepGrad)" />
              </g>
              {blips.map((b) => (
                <g key={b.full_name} style={{ animationDelay: `${b.delay}s` }} className="animate-blip-in">
                  <circle cx={b.x} cy={b.y} r="3.2" className="animate-blip-ping" fill="#533afd" />
                  <circle cx={b.x} cy={b.y} r="7" fill="#533afd" opacity="0.12" />
                </g>
              ))}
            </svg>
          </div>

          {/* top repos list */}
          <div className="divide-y">
            {data.popular.slice(0, 5).map((p, i) => (
              <a
                key={p.full_name}
                href={`https://github.com/${p.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: langColor(p.language) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:text-primary">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.description}</span>
                </span>
                <StarCount n={p.stars} />
              </a>
            ))}
          </div>
        </div>

        {/* language profile */}
        <div className="border-t px-5 py-4">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Language profile
          </div>
          <div className="space-y-2">
            {data.languages.map((l, i) => (
              <div key={l.language} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{l.language}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${l.pct * (data.languages.length - i) / data.languages.length}%`, transitionDelay: `${i * 90}ms` }}
                  />
                </div>
                <span className="w-10 shrink-0 font-mono text-[11px] text-muted-foreground">{l.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  )
}

/* ── trust stat (count-up) ───────────────────── */
function Stat({ icon, label, value, suffix, display }: { icon: React.ReactNode; label: string; value: number; suffix?: string; display?: string }) {
  const n = useCountUp(value)
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-card/60 px-4 py-6 animate-fade-up">
      <div className="flex items-center gap-1.5 text-primary">{icon}</div>
      <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {display ?? n.toLocaleString()}{suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function UnderstoodBar({ u, elapsed }: { u: Understood; elapsed: number }) {
  if (!u?.semantic && !u?.filters?.language) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm animate-fade-up">
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
    <SpotlightCard className="repo-card animate-fade-up" spotlightColor="rgba(83, 58, 253, 0.14)">
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
              <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: langColor(r.language) }} />
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
                className="block h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${Math.round(sem * 100)}%` }}
              />
            </span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              open <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
      </CardContent>
    </SpotlightCard>
  )
}

function ResultSkeleton({ rank }: { rank: number }) {
  return (
    <Card className="animate-fade-up" style={{ animationDelay: `${rank * 40}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="skeleton h-3.5 w-5 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton ml-auto h-4 w-14 rounded" />
        </div>
        <div className="skeleton mt-3 h-3 w-full rounded" />
        <div className="skeleton mt-1.5 h-3 w-2/3 rounded" />
        <div className="skeleton mt-3 h-10 w-full rounded" />
      </CardContent>
    </Card>
  )
}

const FEATURES = [
  { icon: BookOpen, title: 'Reads the README, not just the tags', desc: 'GitHub search matches names and topics. RepoRadar reads the actual contents of every indexed repository, so a project is findable by what it does — not just how it is labeled.' },
  { icon: MessageSquareText, title: 'Speaks your language, not keywords', desc: 'Describe the problem like you are asking a colleague: an intent model turns your words into the search. No boolean operators, no syntax to learn.' },
  { icon: Layers, title: 'Two rankings fused into one', desc: 'Keyword hits (BM25) and meaning hits (semantic embeddings) are fused with reciprocal rank fusion — then resolved by an LLM, with the matching snippet shown as proof.' },
  { icon: Shield, title: 'No sign-up, no tracking, honest latency', desc: 'Free, anonymous, and open source. Every query is answered from a local index and you see exactly how long it took.' },
]

const COMPARE = [
  { feature: 'Searches README contents, not just titles', us: true, git: false },
  { feature: 'Understands plain-English intent', us: true, git: false },
  { feature: 'Fuses keyword + semantic ranking', us: true, git: false },
  { feature: 'Shows why each repo matched (snippet)', us: true, git: true },
  { feature: 'No sign-up, no tracking', us: true, git: false },
  { feature: 'Runs locally / self-hostable', us: true, git: false },
]

const FAQS = [
  { q: 'Is it really free?', a: 'Yes — like the repo scanner, RepoRadar is open source (MIT). Run it on your own machine, point it at any collection of public GitHub repos, and search as much as you want. No account, no API bills, no caps.' },
  { q: 'How is this different from GitHub search?', a: 'GitHub search looks at names, topics and descriptions. RepoRadar reads the full README of every indexed repository, understands what you mean in plain English, and fuses keyword + semantic rankings. The result: “banana game where I raise cute animals” actually finds that project — even when it has 2 stars and zero tags.' },
  { q: 'Where does my query go?', a: 'Each full-text and semantic search runs against the local index. An LLM (via Groq) helps interpret intent and rank final results; you share no personal data, and nothing is stored. If you self-host, even the LLM call can point anywhere you choose.' },
  { q: 'What does “ranked with proof” mean?', a: 'Each result shows the exact snippet from the README that matched, plus which signals triggered — words, meaning, or both. You can see why a repository ranked where it did, instead of trusting a black box.' },
  { q: 'Can I add my own repositories?', a: 'The crawler is fully local: edit the seed phrases file, run crawl + embed and your new repos join the index on the next server start. The web app you are looking at serves that same local index.' },
]

function FeatureGrid() {
  return (
    <section className="mt-16">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Why RepoRadar</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Search that behaves like a senior engineer</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Not “type the tag you hope exists”. You describe the problem; RepoRadar finds who already solved it.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <SpotlightCard key={f.title} className="p-5 animate-fade-up" spotlightColor="rgba(83, 58, 253, 0.10)" >
            <div style={{ animationDelay: `${i * 70}ms` }} className="animate-fade-up">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  )
}

function CompareTable() {
  const rows = [...FEATURES.map(f => f.title.slice(0, 60))]
  return (
    <section className="mt-16">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Side by side</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">RepoRadar vs GitHub search</h2>
      </div>
      <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-semibold">What you get</th>
              <th className="w-24 px-4 py-3 text-center font-semibold text-primary">RepoRadar</th>
              <th className="w-24 px-4 py-3 text-center font-semibold text-muted-foreground">GitHub</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {COMPARE.map((row) => (
              <tr key={row.feature} className="bg-card transition-colors hover:bg-muted/30">
                <td className="px-4 py-2.5 text-foreground/90">{row.feature}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.git ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </span>
                  ) : (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                      <X className="h-3 w-3 text-muted-foreground/50" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        GitHub is a wonderful platform — this is what a search built specifically for finding solves looks like.
      </p>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="mx-auto mt-16 max-w-2xl">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
      </div>
      <div className="mt-6 space-y-2">
        {FAQS.map((f, i) => (
          <div key={f.q} className="overflow-hidden rounded-lg border bg-card">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-medium hover:bg-muted/40"
              aria-expanded={open === i}
            >
              {f.q}
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CtaBand({ onSearch }: { onSearch: () => void }) {
  return (
    <section className="cta-band mt-16 overflow-hidden rounded-2xl border px-6 py-10 text-center">
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        Find the repo that actually solves your problem
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Every repo on the radar is one search away — describe your problem and see who already solved it.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onSearch} className="gap-2">
          Try it on your problem <ArrowRight className="h-4 w-4" />
        </Button>
        <a href="https://github.com/KarmSorathiya378/repordar" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="lg" className="gap-2">
            <GitBranch className="h-4 w-4" /> View source
          </Button>
        </a>
      </div>
    </section>
  )
}

export default function App() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<SearchResponse | null>(null)
  const [error, setError] = useState('')
  const [repoCount, setRepoCount] = useState<number | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [popular, setPopular] = useState<PopularResponse | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiHealth().then((h) => setRepoCount(h.repos)).catch(() => { })
    apiStats().then(setStats).catch(() => { })
    apiPopular().then(setPopular).catch(() => { })
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
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [loading])

  const scrollToSearch = useCallback(() => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => inputRef.current?.focus(), 450)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Radar className="h-4 w-4" />
            </span>
            RepoRadar
          </div>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#results" className="hover:text-foreground">Results</a>
            <a href="#features" className="hover:text-foreground">Why RepoRadar</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              {repoCount ? `${repoCount.toLocaleString()} repos` : '…'}
            </span>
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">/</kbd>
            <a href="https://github.com/KarmSorathiya378/repordar" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Source on GitHub">
              <GitBranch className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24">
        {/* Hero */}
        <section className="relative pt-16 pb-4 text-center sm:pt-20">
          <HeroField />
          <div className="mb-5 animate-fade-up">
            <ShinyText
              text={`Live · ${repoCount ? repoCount.toLocaleString() + ' repos indexed' : 'indexing…'}`}
              speed={2.5}
              color="#64748b"
              shineColor="#533afd"
              className="text-xs font-semibold uppercase tracking-widest"
            />
          </div>

          <h1 className="split-headline text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            <SplitText
              text="Find the repo that actually solves your problem"
              tag="span"
              splitType="words"
              delay={35}
              duration={0.7}
              from={{ opacity: 0, y: 26 }}
              to={{ opacity: 1, y: 0 }}
            />
          </h1>

          <div className="mx-auto mt-4 max-w-xl text-pretty">
            <BlurText
              text="Describe what you're building in plain English. RepoRadar reads the contents of every README — so the hidden, low-star project you need surfaces with the famous ones."
              delay={120}
              animateBy="words"
              direction="top"
              className="text-base text-muted-foreground"
            />
          </div>

          {/* Search — spotlight follows the cursor */}
          <SpotlightCard
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 p-1.5 shadow-card animate-fade-up focus-within:ring-2 focus-within:ring-ring/60"
            spotlightColor="rgba(83, 58, 253, 0.18)"
          >
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
          </SpotlightCard>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: '240ms' }}>
            <span className="text-xs text-muted-foreground">Try</span>
            {EXAMPLES.map((ex) => (
              <Magnet key={ex.q} padding={40} magnetStrength={2}>
                <Button variant="outline" size="sm" onClick={() => { setQ(ex.q); run(ex.q) }}>
                  {ex.emoji} {ex.label}
                </Button>
              </Magnet>
            ))}
          </div>

          {/* trust strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: '320ms' }}>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> No sign-up, no tracking</span>
            <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Reads every README, not just tags</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> LLM understands intent</span>
          </div>
        </section>

        {/* Live radar — real top repos right now */}
        <RadarPanel data={popular} total={repoCount} />

        {/* Live stats band */}
        {stats && (
          <section id="status" className="mt-8 scroll-mt-20 overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm animate-fade-up">
            <div className="flex items-center gap-2 border-b bg-muted/20 px-5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                System status · live
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              <Stat icon={<Database className="h-4 w-4" />} label="Repos indexed" value={stats.repos} />
              <Stat icon={<Activity className="h-4 w-4" />} label="Queries served" value={stats.total_queries} />
              <Stat icon={<Zap className="h-4 w-4" />} label="Unique queries" value={stats.unique_queries} />
              <Stat icon={<Shield className="h-4 w-4" />} label="Uptime" value={stats.uptime_sec} display={fmtUptime(stats.uptime_sec)} />
            </div>
          </section>
        )}

        {/* Feature grid */}
        <section id="features" className="scroll-mt-20">
          <FeatureGrid />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t pt-10 mt-16">
          <div className="mb-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Three steps, one answer</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { n: '01', t: 'Describe the problem', d: 'Type what you\u2019re building in plain English. No keywords needed — say it like you\u2019d ask a colleague.' },
              { n: '02', t: 'We read the READMEs', d: 'An LLM extracts what you mean, then we search the actual contents of every indexed README — keywords and meaning.' },
              { n: '03', t: 'Ranked with proof', d: 'Fused keyword + semantic scores, with the matched snippet shown so you can see why each repo ranked.' },
            ].map((s, i) => (
              <div key={s.n} className="relative flex gap-4 animate-fade-up sm:block" style={{ animationDelay: `${i * 80}ms` }}>
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

        {/* Comparison */}
        <CompareTable />

        {/* FAQ */}
        <Faq />

        {/* CTA */}
        <CtaBand onSearch={scrollToSearch} />

        {/* Results */}
        <section id="results" ref={resultsRef} className="scroll-mt-20 mt-16">
          {loading && (
            <div className="mt-8 space-y-3">
              <ResultSkeleton rank={1} />
              <ResultSkeleton rank={2} />
              <ResultSkeleton rank={3} />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-up">
              ⚠️ {error}
            </div>
          )}

          {resp && !loading && (
            <div className="mt-8">
              <UnderstoodBar u={resp.understood} elapsed={resp.elapsed_ms} />

              {resp.results.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground animate-fade-up">
                  <div className="text-3xl">📡</div>
                  <p className="mt-3 font-medium text-foreground">Nothing on the radar for that one</p>
                  <p className="mt-1 text-sm">Try different words, or describe the problem more broadly.</p>
                </div>
              ) : (
                <div className="mt-4 flex items-baseline gap-2 animate-fade-up">
                  <h2 className="font-semibold">
                    {resp.results.length} result{resp.results.length > 1 ? 's' : ''}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    for “{resp.query}”
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {resp.elapsed_ms} ms · keyword + semantic + LLM
                  </span>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {resp.results.map((r, i) => <RepoCard key={r.full_name} r={r} rank={i + 1} />)}
              </div>

              {/* People are searching */}
              {stats && stats.top_queries.length > 0 && (
                <div className="mt-10 rounded-xl border bg-muted/30 p-4 animate-fade-up">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    People are searching the radar for
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {stats.top_queries.slice(0, 8).map((tq) => (
                      <button
                        key={tq.q}
                        onClick={() => { setQ(tq.q); run(tq.q) }}
                        className="rounded-md border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {tq.q} <span className="text-[10px] text-muted-foreground/60">×{tq.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <Separator className="my-10" />

        <footer className="animate-fade-up">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Radar className="h-3.5 w-3.5" />
                </span>
                RepoRadar
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Semantic search over GitHub's hidden gems. Every README is read — not just tags and titles.
              </p>
            </div>

            <div className="flex gap-12">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li><a href="#how" className="text-foreground/80 hover:text-primary">How it works</a></li>
                  <li><a href="#results" className="text-foreground/80 hover:text-primary">Results</a></li>
                  <li><a href="#status" className="text-foreground/80 hover:text-primary">Status</a></li>
                  <li><a href="#features" className="text-foreground/80 hover:text-primary">Why RepoRadar</a></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>
                    <a href="https://github.com/KarmSorathiya378/repordar" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary">
                      GitHub <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li><span className="text-foreground/60">MIT licensed</span></li>
                  <li><span className="text-foreground/60">By Karm Sorathiya</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row">
            <span>© 2026 RepoRadar · semantic search over public GitHub repositories</span>
            <span className="font-mono">BM25 + semantic vectors + LLM ranking</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
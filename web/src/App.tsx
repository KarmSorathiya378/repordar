import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Lock, Globe, Sparkles, Search, Star, ExternalLink, Radar, Loader2, ArrowRight, GitBranch, Shield, Zap, Database, Activity,
  BookOpen, Layers, MessageSquareText, Check, X, ChevronDown, Sun, Moon, SlidersHorizontal, BookMarked, Copy, Terminal,
  Download, Bookmark, Gamepad2, KeyRound, ImageIcon, SearchX, Bot, Cpu, Cloud, BarChart3, HelpCircle, Code2, Trash2, AlertCircle, Menu,
  Trophy, Flame, QrCode, Compass, Sparkle, ArrowUpRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  apiHealth, apiSearch, apiStats, apiPopular,
  type RepoResult, type SearchResponse, type Understood, type StatsResponse, type PopularResponse, type SearchOptions, type PopularRepo, type PopularLanguage
} from '@/lib/api'

// ── Custom Component Modules ──
import { RepoDrawer } from '@/components/RepoDrawer'
import { FilterToolbar, type FilterState } from '@/components/FilterToolbar'
import { CommandPalette } from '@/components/CommandPalette'
import { BookmarksDrawer } from '@/components/BookmarksDrawer'
import { RepositoryVaultScene } from '@/components/RepositoryVaultScene'


// ── ReactBits components ─────────────────────
import Particles from '@/components/reactbits/Particles'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import Magnet from '@/components/reactbits/Magnet'

const EXAMPLES = [
  { icon: Gamepad2, label: 'banana game', q: 'video game where i raise and level up cute animal characters' },
  { icon: KeyRound, label: 'api key manager', q: 'secure api key management for ai agents' },
  { icon: Terminal, label: 'terminal multiplexer', q: 'terminal multiplexer alternative to tmux' },
  { icon: Database, label: 'kv database', q: 'lightweight embedded key value database in go' },
  { icon: ImageIcon, label: 'remove bg', q: 'remove background from photos programmatically' },
]

const DOMAIN_CHIPS = [
  { icon: Bot, label: 'AI & RAG Agents', q: 'agentic workflow multi agent system python' },
  { icon: Zap, label: 'FastAPI Async', q: 'fastapi async alembic postgresql boilerplate' },
  { icon: Cpu, label: 'Rust CLI Tools', q: 'terminal git diff viewer diff-so-fancy alternative rust' },
  { icon: Cloud, label: 'Cloudflare Edge', q: 'hono v4 cloudflare d1 r2 starter' },
  { icon: Bot, label: 'Robotics & ROS2', q: 'ros2 humble navigation2 nav2 stack' },
  { icon: Sparkles, label: 'Interactive UI', q: 'framer motion interactive micro interaction react' },
  { icon: Shield, label: 'eBPF Security', q: 'ebpf network packet filter monitor rust' },
  { icon: BarChart3, label: 'Data Pipelines', q: 'duckdb spatial vector search analytics python' },
]

// Curated Discovery Sectors tailored specifically to RepoRadar
const DISCOVERY_SECTORS = [
  {
    title: 'AI & Autonomous Agents',
    badge: 'LLM & RAG',
    badgeColor: 'bg-indigo-500 text-white',
    cssClass: 'chest-starter',
    icon: Bot,
    query: 'agentic workflow multi agent system python langgraph autogen',
    desc: 'Autonomous multi-agent swarms, RAG pipelines, and reasoning loops.'
  },
  {
    title: 'High-Performance Rust',
    badge: 'Systems',
    badgeColor: 'bg-amber-600 text-white',
    cssClass: 'chest-bronze',
    icon: Cpu,
    query: 'terminal git diff viewer alternative rust cli tokio',
    desc: 'Memory-safe blazing fast CLI tools, parsers, and engines.'
  },
  {
    title: 'Async API Backends',
    badge: 'Web & DB',
    badgeColor: 'bg-emerald-600 text-white',
    cssClass: 'chest-silver',
    icon: Zap,
    query: 'fastapi async alembic postgresql boilerplate redis sqlmodel',
    desc: 'Production-ready async backend boilerplates and ORM setups.'
  },
  {
    title: 'Edge & Serverless',
    badge: 'Cloud Edge',
    badgeColor: 'bg-sky-600 text-white',
    cssClass: 'chest-gold',
    icon: Cloud,
    query: 'hono v4 cloudflare d1 r2 starter serverless edge typescript',
    desc: 'Ultra low-latency microservices running on Cloudflare & D1.'
  },
  {
    title: 'Kernel & eBPF Security',
    badge: 'Kernel',
    badgeColor: 'bg-purple-600 text-white',
    cssClass: 'chest-diamond',
    icon: Shield,
    query: 'ebpf network packet filter monitor rust aya libbpf',
    desc: 'Observability, firewall packet inspection, and trace logging.'
  },
  {
    title: 'Embedded KV Storage',
    badge: 'Databases',
    badgeColor: 'bg-fuchsia-600 text-white',
    cssClass: 'chest-master',
    icon: Database,
    query: 'lightweight embedded key value database in go badger bbolt',
    desc: 'Zero-dependency embedded transactional key-value databases.'
  },
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
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#F5B83D]">
      <Star className="h-3.5 w-3.5 fill-[#F5B83D] text-[#F5B83D]" />
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

/* ── hero — WebGL particle field ── */
function HeroField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="radar-glow absolute inset-x-0 top-[-12rem] h-[38rem]" />
      <div className="absolute inset-0 opacity-70">
        <CanvasSafe>
          <Particles
            particleColors={['#5546F6', '#7C6AF7', '#A594FF']}
            particleCount={85}
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


/* ── Discovery Sectors Component (Curated Discovery Cards) ── */

function DiscoverySectorsSection({ onSelectQuery }: { onSelectQuery: (q: string) => void }) {
  return (
    <section className="mt-16 space-y-6 animate-fade-up">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" /> Curated Repository Discovery Sectors
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant one-click semantic sweeps across specialized developer domains.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-primary">Explore All &gt;</span>
        </div>

        {/* Discovery Cards Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DISCOVERY_SECTORS.map((s) => {
            const IconComp = s.icon
            return (
              <div
                key={s.title}
                onClick={() => onSelectQuery(s.query)}
                className={`group cursor-pointer relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${s.cssClass}`}
              >
                <span className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${s.badgeColor}`}>
                  {s.badge}
                </span>
                <div className="my-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/40 shadow-inner group-hover:scale-110 transition-transform">
                  <IconComp className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="font-black text-xs text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground leading-tight line-clamp-2">{s.desc}</p>
                <div className="mt-2.5 flex items-center gap-1 font-mono text-[10px] font-bold text-primary group-hover:underline">
                  <span>Launch Sweep</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── Hall of Fame Podium Component (Top GitHub Repositories) ── */
function PodiumLeaderboard({ data, onInspect }: { data: PopularResponse | null; onInspect: (name: string) => void }) {
  const topRepos = data?.popular?.slice(0, 3) ?? [
    { full_name: 'public-apis/public-apis', stars: 454365, description: 'A collective list of free APIs' },
    { full_name: 'freeCodeCamp/freeCodeCamp', stars: 395000, description: 'Open source codebase and curriculum' },
    { full_name: 'sindresorhus/awesome', stars: 310000, description: 'Awesome lists about all kinds of topics' },
  ]

  const top1 = topRepos[0]
  const top2 = topRepos[1]
  const top3 = topRepos[2]

  return (
    <section className="mt-16 animate-fade-up">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-[#F5B83D]" /> Radar Hall of Fame
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Top starred repositories indexed across the RepoRadar intelligence network.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0d111d] p-6 text-white shadow-2xl">
        {/* Header telemetry badge */}
        <div className="mb-6 flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            RADAR RADIAL ELEVATION · TOP STARRED
          </span>
          <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-amber-300">Live Index</span>
        </div>

        {/* Podium Layout: TOP 2 (Left), TOP 1 (Center Highest), TOP 3 (Right) */}
        <div className="grid grid-cols-3 gap-3 items-end pt-4 pb-2 max-w-2xl mx-auto">
          {/* TOP 2 */}
          {top2 && (
            <div
              onClick={() => onInspect(top2.full_name)}
              className="cursor-pointer group flex flex-col items-center rounded-2xl border border-rose-500/40 bg-gradient-to-b from-rose-950/60 to-rose-900/30 p-3 text-center transition-all hover:scale-105"
            >
              <div className="mb-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 font-mono text-xs font-extrabold text-rose-400 flex items-center gap-1">
                <Flame className="h-3 w-3 fill-rose-400" /> {(top2.stars / 1000).toFixed(1)}k ★
              </div>
              <span className="font-black text-xs text-rose-400 tracking-wider">RANK #2</span>
              <div className="my-2 h-16 w-full rounded-xl bg-slate-950/60 p-2 text-left text-[11px] overflow-hidden border border-rose-500/20 group-hover:border-rose-400">
                <span className="font-bold block truncate text-slate-200">{top2.full_name}</span>
                <span className="block truncate text-[10px] text-slate-400">{top2.description}</span>
              </div>
              <div className="w-full rounded-lg bg-rose-500 py-1.5 text-[10px] font-bold text-white shadow-md">
                Inspect README
              </div>
            </div>
          )}

          {/* TOP 1 (Center Highest) */}
          {top1 && (
            <div
              onClick={() => onInspect(top1.full_name)}
              className="cursor-pointer group flex flex-col items-center rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-950/80 to-amber-900/40 p-4 text-center transition-all hover:scale-105 shadow-xl shadow-amber-500/10 -translate-y-2"
            >
              <div className="mb-1 rounded-full bg-amber-400/20 px-3 py-0.5 font-mono text-xs font-black text-amber-300 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 fill-amber-300" /> {(top1.stars / 1000).toFixed(1)}k ★
              </div>
              <span className="font-black text-sm text-amber-400 tracking-wider">👑 RANK #1</span>
              <div className="my-2 h-20 w-full rounded-xl bg-slate-950/80 p-2.5 text-left text-xs overflow-hidden border border-amber-400/30 group-hover:border-amber-300">
                <span className="font-bold block truncate text-amber-200">{top1.full_name}</span>
                <span className="block truncate text-[10px] text-slate-300">{top1.description}</span>
              </div>
              <div className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 py-2 text-xs font-extrabold text-slate-950 shadow-md">
                Inspect README ★
              </div>
            </div>
          )}

          {/* TOP 3 */}
          {top3 && (
            <div
              onClick={() => onInspect(top3.full_name)}
              className="cursor-pointer group flex flex-col items-center rounded-2xl border border-sky-500/40 bg-gradient-to-b from-sky-950/60 to-sky-900/30 p-3 text-center transition-all hover:scale-105"
            >
              <div className="mb-1 rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-xs font-extrabold text-sky-400 flex items-center gap-1">
                <Flame className="h-3 w-3 fill-sky-400" /> {(top3.stars / 1000).toFixed(1)}k ★
              </div>
              <span className="font-black text-xs text-sky-400 tracking-wider">RANK #3</span>
              <div className="my-2 h-16 w-full rounded-xl bg-slate-950/60 p-2 text-left text-[11px] overflow-hidden border border-sky-500/20 group-hover:border-sky-400">
                <span className="font-bold block truncate text-slate-200">{top3.full_name}</span>
                <span className="block truncate text-[10px] text-slate-400">{top3.description}</span>
              </div>
              <div className="w-full rounded-lg bg-sky-500 py-1.5 text-[10px] font-bold text-white shadow-md">
                Inspect README
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── 3-Step Search Pipeline Architecture Component ── */
function SearchPipelineSection() {
  const steps = [
    {
      num: '01',
      title: 'Intent Extraction',
      desc: 'LLM analyzes plain English to detect intent, extract libraries, language requirements, and minimum stars.',
      icon: MessageSquareText,
      tag: 'LLM Parsing'
    },
    {
      num: '02',
      title: 'Dual Engine Sweep',
      desc: 'BM25 matches keyword tokens while 384-dim ONNX embeddings measure geometric vector distances across READMEs.',
      icon: Layers,
      tag: 'BM25 + ONNX'
    },
    {
      num: '03',
      title: 'Reciprocal Rank Fusion',
      desc: 'Combines full-text score with cosine semantic similarity, highlighting exact matching snippets with proof.',
      icon: Shield,
      tag: 'RRF & Proof'
    }
  ]

  return (
    <section className="mt-16 animate-fade-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
          How RepoRadar Reads & Evaluates Codebases
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl mx-auto">
          We index the full README text of 107,000+ repositories so projects are findable by what they do, not just tags.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => {
          const Icon = s.icon
          return (
            <SpotlightCard key={s.num} className="p-6 rounded-2xl border border-border bg-card shadow-sm" spotlightColor="rgba(59, 130, 246, 0.12)">
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono font-extrabold text-sm">
                  {s.num}
                </span>
                <Badge variant="outline" className="font-mono text-[10px] border-border">{s.tag}</Badge>
              </div>
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" /> {s.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </SpotlightCard>
          )
        })}
      </div>
    </section>
  )
}

/* ── live radar: interactive vector radar sweep + language profile ── */
function RadarPanel({ data, total, onInspect }: { data: PopularResponse | null; total: number | null; onInspect: (name: string) => void }) {
  const [hoveredBlip, setHoveredBlip] = useState<PopularRepo | null>(null)

  const blips = useMemo(() => {
    if (!data) return []
    return data.popular.slice(0, 8).map((p: PopularRepo, i: number) => {
      let seed = 0
      for (const c of p.full_name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      const ang = ((seed % 300) + 30) * (Math.PI / 180)
      const r = 30 + ((seed >> 3) % 65)
      return { ...p, x: 120 + r * Math.cos(ang), y: 120 + r * Math.sin(ang), delay: i * 0.25 }
    })
  }, [data])

  if (!data) {
    return (
      <div className="mx-auto mt-8 max-w-3xl animate-fade-up">
        <div className="h-64 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl animate-fade-up">
      <SpotlightCard className="overflow-hidden shadow-md border border-border bg-card rounded-2xl" spotlightColor="rgba(59, 130, 246, 0.12)">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-muted/20">
          <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse-dot" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            LIVE RADAR · TOP REPOSITORIES
          </span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {(total ?? data.total).toLocaleString()} indexed
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
          {/* interactive vector radar sweep */}
          <div className="relative flex flex-col items-center justify-center border-b border-border p-4 sm:border-b-0 sm:border-r bg-muted/10">
            {/* active blip tooltip indicator */}
            <div className="h-6 mb-1 text-center truncate w-full px-2">
              {hoveredBlip ? (
                <span className="font-mono text-[11px] font-semibold text-primary animate-fade-up">
                  <Radar className="h-3 w-3 inline mr-1 text-primary animate-pulse" />
                  {hoveredBlip.full_name} ({hoveredBlip.stars.toLocaleString()} ★)
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/70">Hover target blips on sweep</span>
              )}
            </div>

            <svg viewBox="0 0 240 240" className="h-48 w-48 select-none">
              <defs>
                <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* polar concentric distance rings */}
              {[30, 60, 90, 110].map((r) => (
                <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="currentColor" className="text-border/80" strokeWidth="1" strokeDasharray={r === 110 ? "none" : "3 3"} />
              ))}
              {/* grid axes */}
              <line x1="10" y1="120" x2="230" y2="120" stroke="currentColor" className="text-border/60" strokeWidth="0.75" />
              <line x1="120" y1="10" x2="120" y2="230" stroke="currentColor" className="text-border/60" strokeWidth="0.75" />
              {/* 360deg rotating sweep beam */}
              <g className="animate-radar-spin" style={{ transformOrigin: '120px 120px' }}>
                <path d="M120 120 L120 10 A110 110 0 0 1 224 175 Z" fill="url(#sweepGrad)" />
              </g>
              {/* repository target blips */}
              {blips.map((b: any) => (
                <g
                  key={b.full_name}
                  onMouseEnter={() => setHoveredBlip(b)}
                  onMouseLeave={() => setHoveredBlip(null)}
                  onClick={() => onInspect(b.full_name)}
                  className="cursor-pointer transition-transform hover:scale-125"
                  style={{ animationDelay: `${b.delay}s` }}
                >
                  <circle cx={b.x} cy={b.y} r="3.5" fill={hoveredBlip?.full_name === b.full_name ? "#10b981" : "#3b82f6"} className="animate-blip-ping" />
                  <circle cx={b.x} cy={b.y} r="8" fill="#3b82f6" opacity="0.2" />
                </g>
              ))}
            </svg>
          </div>

          {/* top repos list */}
          <div className="divide-y divide-border">
            {data.popular.slice(0, 5).map((p: PopularRepo, i: number) => (
              <div
                key={p.full_name}
                onClick={() => onInspect(p.full_name)}
                className="group flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: langColor(p.language) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary transition-colors">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.description}</span>
                </span>
                <StarCount n={p.stars} />
              </div>
            ))}
          </div>
        </div>

        {/* language profile */}
        <div className="border-t border-border px-5 py-4 bg-muted/10">
          <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            LANGUAGE DISTRIBUTION PROFILE
          </div>
          <div className="space-y-2.5">
            {data.languages.map((l: PopularLanguage, i: number) => (
              <div key={l.language} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right font-mono text-xs font-medium text-foreground">{l.language}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${l.pct}%`, transitionDelay: `${i * 90}ms` }}
                  />
                </div>
                <span className="w-12 shrink-0 font-mono text-xs font-semibold text-primary text-right">{l.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  )
}

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

function RepoCard({
  r,
  rank,
  onInspect,
  isBookmarked,
  onToggleBookmark,
  onTopicClick,
}: {
  r: RepoResult
  rank: number
  onInspect: (name: string) => void
  isBookmarked: boolean
  onToggleBookmark: (r: RepoResult) => void
  onTopicClick: (topic: string) => void
}) {
  const sem = r.sem_score ?? 0
  const hasWords = r.bm25_score != null
  const hasMeaning = r.sem_score != null
  const [copiedClone, setCopiedClone] = useState(false)

  const handleCopyClone = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`git clone https://github.com/${r.full_name}.git`)
    setCopiedClone(true)
    setTimeout(() => setCopiedClone(false), 2000)
  }

  return (
    <SpotlightCard className="repo-card animate-fade-up overflow-hidden border border-border/80 bg-card rounded-xl shadow-sm" spotlightColor="rgba(85, 70, 246, 0.12)">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-6 shrink-0 text-right font-mono text-sm text-muted-foreground">{rank}</span>
            <button
              onClick={() => onInspect(r.full_name)}
              className="truncate font-bold text-base text-foreground hover:text-primary hover:underline text-left transition-colors"
            >
              {r.full_name}
            </button>
            {r.language && (
              <Badge variant="secondary" className="hidden shrink-0 font-mono text-[11px] sm:inline-flex bg-muted text-foreground">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ background: langColor(r.language) }} />
                {r.language}
              </Badge>
            )}
            {r.license && (
              <Badge variant="outline" className="hidden shrink-0 font-mono text-[10px] text-muted-foreground md:inline-flex border-border">
                {r.license}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StarCount n={r.stars} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleBookmark(r)}
              className={`h-8 w-8 rounded-full transition-transform active:scale-90 duration-150 ${isBookmarked ? 'text-[#F5B83D] hover:text-[#F5B83D]' : 'text-muted-foreground hover:text-foreground'}`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark repository'}
            >
              <Bookmark className={`h-4 w-4 transition-transform duration-200 ${isBookmarked ? 'fill-[#F5B83D] text-[#F5B83D] scale-110' : ''}`} />
            </Button>
          </div>
        </div>

        {r.description && (
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
        )}

        {r.topics && r.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.topics.map((t) => (
              <button
                key={t}
                onClick={() => onTopicClick(t)}
                className="rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {r.snippet && (
          <div
            className="mt-3.5 rounded-lg border border-border/80 bg-[#F5F6FA] dark:bg-[#151925] px-3.5 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground break-words"
            dangerouslySetInnerHTML={{ __html: renderSnippet(r.snippet) }}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Badge variant={hasWords ? 'secondary' : 'outline'} className="uppercase text-[10px] font-mono px-2 py-0.5">
              words
            </Badge>
            <Badge variant={hasMeaning ? 'secondary' : 'outline'} className="uppercase text-[10px] font-mono px-2 py-0.5">
              meaning
            </Badge>
            <span className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:inline-flex ml-1">
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${Math.round(sem * 100)}%` }}
                />
              </span>
              {Math.round(sem * 100)}% match
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyClone} className="h-7 gap-1 font-mono text-[11px] hover:text-primary">
              {copiedClone ? <Check className="h-3 w-3 text-[#36CFA0]" /> : <Terminal className="h-3 w-3 text-primary" />}
              {copiedClone ? 'Copied' : 'git clone'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onInspect(r.full_name)} className="h-7 gap-1 text-xs border-border">
              <BookOpen className="h-3 w-3 text-primary" /> Inspect README
            </Button>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
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
    <section className="mt-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Search that behaves like a senior engineer</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Not “type the tag you hope exists”. You describe the problem; RepoRadar finds who already solved it.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <SpotlightCard key={f.title} className="p-5 animate-fade-up" spotlightColor="rgba(16, 185, 129, 0.10)" >
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
  return (
    <section className="mt-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">RepoRadar vs GitHub search</h2>
      </div>
      <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-semibold">What you get</th>
              <th className="w-24 px-4 py-3 text-center font-semibold text-primary">RepoRadar</th>
              <th className="w-24 px-4 py-3 text-center font-semibold text-muted-foreground">GitHub</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
    <section className="mx-auto mt-8 max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
      </div>
      <div className="mt-6 space-y-2">
        {FAQS.map((f, i) => (
          <div key={f.q} className="overflow-hidden rounded-lg border border-border bg-card">
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

function ApiDocsCard() {
  const [copiedCmd, setCopiedCmd] = useState(false)
  const curlExample = `curl -X GET "http://localhost:8123/api/search?q=key+value+store+in+go&limit=10"`

  const handleCopy = () => {
    navigator.clipboard.writeText(curlExample)
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3.5">
        <Code2 className="h-4 w-4 text-primary" />
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          DEVELOPER REST API
        </span>
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">v1.0</Badge>
      </div>

      <div className="p-5 space-y-4 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">GET</span>
            <span className="font-semibold text-foreground">/api/search</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Execute hybrid BM25 + ONNX vector embedding semantic search across 107,000+ indexed repositories.
          </p>
        </div>

        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-[#10b981]/10 px-2 py-0.5 font-bold text-[#10b981]">GET</span>
            <span className="font-semibold text-foreground">/api/popular</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Fetch top starred repositories and real-time language percentage breakdown.
          </p>
        </div>

        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">GET</span>
            <span className="font-semibold text-foreground">/api/stats</span>
          </div>
          <p className="text-xs text-muted-foreground">
            System performance telemetry, query counts, unique search tracking, and server uptime.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">Example cURL Request</span>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground">
              {copiedCmd ? <Check className="h-3 w-3 text-[#36CFA0]" /> : <Copy className="h-3 w-3" />}
              {copiedCmd ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="rounded-lg border border-border bg-[#F5F6FA] dark:bg-[#151925] p-3 font-mono text-xs text-foreground overflow-x-auto">
            {curlExample}
          </pre>
        </div>
      </div>
    </div>
  )
}

function CtaBand({ onSearch }: { onSearch: () => void }) {
  return (
    <section className="cta-band mt-16 overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
        Find the repo that <span className="brand-gradient-text">actually</span> solves your problem.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Every repo on the radar is one search away. Describe your problem and see who already solved it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onSearch} className="gap-2 bg-primary hover:bg-[#4638D9] text-white font-semibold shadow-sm transition-all active:scale-95">
          Try it on your problem <ArrowRight className="h-4 w-4" />
        </Button>
        <a href="https://github.com/KarmSorathiya378/repordar" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="lg" className="gap-2 border-border bg-card hover:bg-secondary text-foreground font-medium">
            <GitBranch className="h-4 w-4" /> View source
          </Button>
        </a>
      </div>
    </section>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'radar' | 'sectors' | 'leaderboard' | 'how' | 'saved' | 'faq'>('search')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<SearchResponse | null>(null)
  const [error, setError] = useState('')
  const [repoCount, setRepoCount] = useState<number | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [popular, setPopular] = useState<PopularResponse | null>(null)

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    language: 'All',
    minStars: 0,
    sortBy: 'rrf',
    limit: 10,
  })

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('repordar_theme') as 'light' | 'dark') || 'light'
  })

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<RepoResult[]>(() => {
    try {
      const saved = localStorage.getItem('repordar_bookmarks')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Modals & Drawers
  const [inspectRepoName, setInspectRepoName] = useState<string | null>(null)
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false)
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Sync theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('repordar_theme', theme)
  }, [theme])

  // Sync bookmarks
  useEffect(() => {
    localStorage.setItem('repordar_bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

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
        setIsCmdPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const run = useCallback(async (queryStr: string, activeFilters = filters) => {
    const trimmed = queryStr.trim()
    if (!trimmed || loading) return
    setActiveTab('search')
    setLoading(true)
    setError('')
    setResp(null)
    try {
      const options: SearchOptions = {
        limit: activeFilters.limit,
        min_stars: activeFilters.minStars > 0 ? activeFilters.minStars : undefined,
        language: activeFilters.language !== 'All' ? activeFilters.language : undefined,
        sort: activeFilters.sortBy,
      }
      const d = await apiSearch(trimmed, options)
      setResp(d)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [loading, filters])

  const handleFilterChange = (fn: (prev: FilterState) => FilterState) => {
    const nextFilters = fn(filters)
    setFilters(nextFilters)
    if (q.trim()) {
      run(q, nextFilters)
    }
  }

  const handleResetFilters = () => {
    const resetState: FilterState = { language: 'All', minStars: 0, sortBy: 'rrf', limit: 10 }
    setFilters(resetState)
    if (q.trim()) {
      run(q, resetState)
    }
  }

  const toggleBookmark = (r: RepoResult) => {
    setBookmarks((prev) => {
      const exists = prev.some((item) => item.full_name === r.full_name)
      if (exists) {
        return prev.filter((item) => item.full_name !== r.full_name)
      } else {
        return [r, ...prev]
      }
    })
  }

  const scrollToSearch = useCallback(() => {
    setActiveTab('search')
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => inputRef.current?.focus(), 450)
  }, [])

  const navItems = [
    { id: 'search', label: 'Semantic Search', icon: '/nav-icons/search.svg' },
    { id: 'radar', label: 'Live Vector Radar', icon: '/nav-icons/radar.svg' },
    { id: 'sectors', label: 'Discovery Sectors', icon: '/nav-icons/explore.svg' },
    { id: 'leaderboard', label: 'Radar Hall of Fame', icon: '/nav-icons/trophy.svg' },
    { id: 'how', label: 'Pipeline Architecture', icon: '/nav-icons/layers.svg' },
    { id: 'saved', label: 'Saved Repositories', icon: '/nav-icons/saved.svg', badge: bookmarks.length },
    { id: 'faq', label: 'FAQ & REST API', icon: '/nav-icons/help.svg' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 graph-paper-bg relative overflow-x-hidden">
      {/* ── FIXED RIGHT-SIDE FLOATING NAVBAR ── */}
      <aside className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 select-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <div key={item.id} className="relative group flex items-center">
              {/* Left Hover Tooltip */}
              <div className="absolute right-16 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 whitespace-nowrap">
                {item.label}
              </div>

              {/* Circular Floating Button with High Quality SVG Icon */}
              <button
                onClick={() => setActiveTab(item.id as any)}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 border border-border/80 ${
                  isActive
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background scale-110 shadow-blue-500/20'
                    : 'hover:bg-secondary opacity-85 hover:opacity-100'
                }`}
                title={item.label}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="h-7 w-7 transition-transform duration-200 group-hover:scale-110"
                  style={{ imageRendering: 'pixelated' }}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-400 font-mono text-[9px] font-bold text-amber-950 shadow-md border border-white">
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </aside>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div
            onClick={() => setActiveTab('search')}
            className="flex cursor-pointer items-center gap-3 font-semibold transition-transform active:scale-95 group"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <img src="/logo.png" alt="RepoRadar Logo" className="h-10 w-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="tracking-tight text-lg font-extrabold text-foreground">RepoRadar</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
                  AI
                </Badge>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">README Semantic Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCmdPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-all hover:border-primary/40 sm:flex shadow-xs"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Quick Find</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="h-9 w-9 rounded-lg border border-border/60 bg-card"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pr-16 sm:pr-20">
        {/* ── TAB 1: SEMANTIC SEARCH ── */}
        {activeTab === 'search' && (
          <div>
            <section className="relative pt-10 pb-4 text-center sm:pt-14 overflow-visible">
              <HeroField />

              {/* ── 7 Pixel Stickers placed in empty outer gutters (never covering content) ── */}
              <div className="pointer-events-none absolute inset-y-0 -left-16 sm:-left-28 md:-left-40 lg:-left-56 xl:-left-72 -right-16 sm:-right-28 md:-right-36 lg:-right-48 xl:-right-60 overflow-visible hidden md:block" aria-hidden>
                {/* 1. Meter / Battery — high outer-left gutter */}
                <div className="absolute left-[2%] lg:left-[4%] xl:left-[6%] top-[8%] -rotate-6">
                  <img src="/files/meter.svg" alt="" className="h-14 w-14 drop-shadow-[0_8px_16px_rgba(100,116,139,0.20)]" style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* 2. Folder — mid outer-left gutter */}
                <div className="absolute left-[-1.5%] sm:left-[0%] lg:left-[1%] xl:left-[2.5%] top-[34%] rotate-6">
                  <img src="/files/folder.svg" alt="" className="h-14 w-14 drop-shadow-[0_8px_16px_rgba(16,185,129,0.20)]" style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* 3. Star — lower outer-left gutter */}
                <div className="absolute left-[3%] lg:left-[5%] xl:left-[8%] top-[62%] -rotate-12">
                  <img src="/files/star.svg" alt="" className="h-14 w-14 drop-shadow-[0_8px_16px_rgba(234,179,8,0.25)]" style={{ imageRendering: 'pixelated' }} />
                </div>

                {/* 4. CMDK / Badge — high outer-right gutter */}
                <div className="absolute right-[3%] lg:right-[5%] xl:right-[8%] top-[10%] rotate-8">
                  <img src="/files/cmdk.svg" alt="" className="h-14 w-14 drop-shadow-[0_8px_16px_rgba(59,130,246,0.20)]" style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* 5. Bookmark — mid outer-right gutter */}
                <div className="absolute right-[-1.5%] sm:right-[0%] lg:right-[1%] xl:right-[2.5%] top-[32%] -rotate-4">
                  <img src="/files/bookmark.svg" alt="" className="h-12 w-12 drop-shadow-[0_8px_16px_rgba(244,63,94,0.20)]" style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* 6. Bolt — lower-mid outer-right gutter */}
                <div className="absolute right-[4%] lg:right-[7%] xl:right-[10%] top-[54%] -rotate-[15deg]">
                  <img src="/files/bolt.svg" alt="" className="h-13 w-13 drop-shadow-[0_8px_16px_rgba(59,130,246,0.25)]" style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* 7. Heart — lower outer-right gutter */}
                <div className="absolute right-[1%] lg:right-[3%] xl:right-[6%] top-[76%] rotate-6">
                  <img src="/files/heart.svg" alt="" className="h-13 w-13 drop-shadow-[0_8px_16px_rgba(244,63,94,0.25)]" style={{ imageRendering: 'pixelated' }} />
                </div>
              </div>

              <h1 className="text-balance text-4xl font-black tracking-tight text-foreground sm:text-6xl leading-[1.02] uppercase font-mono">
                FIND REPOSITORIES BY <span className="brand-gradient-text">WHAT THEY DO</span>
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg font-medium">
                Describe your architecture or problem in plain English. RepoRadar evaluates the complete README contents of over 107,000 public GitHub repositories.
              </p>

              {/* ── Repository Vault Scene ── */}
              <RepositoryVaultScene count={repoCount} />

              <div
                className="mx-auto mt-8 flex max-w-2xl sm:max-w-3xl items-center gap-2 rounded-2xl border-2 border-primary/30 bg-card p-2.5 shadow-xl transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 animate-fade-up"
              >
                <Search className="ml-3 h-5 w-5 shrink-0 text-primary" />
                <Input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && run(q)}
                  placeholder="Describe what you want to build (e.g. key value store in go)..."
                  className="h-12 border-0 shadow-none focus-visible:ring-0 text-base font-sans text-foreground placeholder:text-muted-foreground/70"
                />
                {q && (
                  <button onClick={() => setQ('')} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Button onClick={() => run(q)} disabled={loading} size="lg" className="h-12 px-6 gap-2 bg-gradient-to-r from-primary to-[#4638D9] text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {loading ? 'Scanning' : 'Search Radar'}
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-fade-up">
                {DOMAIN_CHIPS.map((chip) => {
                  const IconComp = chip.icon
                  return (
                    <button
                      key={chip.label}
                      onClick={() => {
                        setQ(chip.q)
                        run(chip.q)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary hover:text-primary active:scale-95 shadow-2xs"
                    >
                      <IconComp className="h-3.5 w-3.5 text-primary" />
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <DiscoverySectorsSection onSelectQuery={(queryStr) => { setQ(queryStr); run(queryStr) }} />
            <PodiumLeaderboard data={popular} onInspect={(name) => setInspectRepoName(name)} />
            <SearchPipelineSection />

            <section id="results" ref={resultsRef} className="scroll-mt-20 mt-12">
              {resp && !loading && (
                <div className="space-y-4">
                  <FilterToolbar
                    filters={filters}
                    onChange={handleFilterChange}
                    onReset={handleResetFilters}
                    results={resp.results}
                    query={resp.query}
                  />

                  <UnderstoodBar u={resp.understood} elapsed={resp.elapsed_ms} />
                </div>
              )}

              {loading && (
                <div className="mt-8 space-y-3">
                  <ResultSkeleton rank={1} />
                  <ResultSkeleton rank={2} />
                  <ResultSkeleton rank={3} />
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive animate-fade-up flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resp && !loading && (
                <div className="mt-6">
                  {resp.results.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground animate-fade-up">
                      <SearchX className="mx-auto h-10 w-10 text-muted-foreground/60" />
                      <p className="mt-3 font-medium text-foreground">Nothing on the radar for that filter criteria</p>
                      <p className="mt-1 text-sm">Try resetting filters or describing the problem more broadly.</p>
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
                        Reset Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-baseline gap-2 animate-fade-up">
                      <h2 className="font-bold text-lg text-foreground">
                        {resp.results.length} result{resp.results.length > 1 ? 's' : ''}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        for “{resp.query}”
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {resp.elapsed_ms} ms · BM25 + ONNX Vector RRF
                      </span>
                    </div>
                  )}

                  <div className="mt-3 space-y-3">
                    {resp.results.map((r: RepoResult, i: number) => (
                      <RepoCard
                        key={r.full_name}
                        r={r}
                        rank={i + 1}
                        onInspect={(name) => setInspectRepoName(name)}
                        isBookmarked={bookmarks.some((b: RepoResult) => b.full_name === r.full_name)}
                        onToggleBookmark={toggleBookmark}
                        onTopicClick={(topic) => {
                          setQ(topic)
                          run(topic)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── TAB 2: LIVE RADAR ── */}
        {activeTab === 'radar' && (
          <div className="pt-8">
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Live Radar Intelligence</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                Real-time index telemetry, vector angle distribution, and top starred repositories across 107,000+ indexed GitHub projects.
              </p>
            </div>

            <RadarPanel data={popular} total={repoCount} onInspect={(name) => setInspectRepoName(name)} />

            {stats && (
              <section id="status" className="mt-10 overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm animate-fade-up">
                <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
                  <span className="h-2 w-2 rounded-full bg-[#36CFA0] animate-pulse-dot" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SYSTEM STATUS · TELEMETRY
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
          </div>
        )}

        {/* ── TAB 3: DISCOVERY SECTORS ── */}
        {activeTab === 'sectors' && (
          <div className="pt-8">
            <DiscoverySectorsSection onSelectQuery={(queryStr) => { setQ(queryStr); run(queryStr) }} />
          </div>
        )}

        {/* ── TAB 4: RADAR HALL OF FAME ── */}
        {activeTab === 'leaderboard' && (
          <div className="pt-8">
            <PodiumLeaderboard data={popular} onInspect={(name) => setInspectRepoName(name)} />
          </div>
        )}

        {/* ── TAB 5: PIPELINE ARCHITECTURE ── */}
        {activeTab === 'how' && (
          <div className="pt-8 space-y-12">
            <SearchPipelineSection />
            <FeatureGrid />
            <CompareTable />
          </div>
        )}

        {/* ── TAB 6: SAVED REPOSITORIES ── */}
        {activeTab === 'saved' && (
          <div className="pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Saved Repositories</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bookmarks.length} bookmarked {bookmarks.length === 1 ? 'repository' : 'repositories'} saved locally in browser memory.
                </p>
              </div>

              {bookmarks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookmarks([])}
                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </Button>
              )}
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-20 text-center animate-fade-up">
                <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-base font-semibold text-foreground">No saved repositories yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Click the bookmark star icon on any search result card to keep a local reference list.
                </p>
                <Button onClick={() => setActiveTab('search')} size="sm" className="mt-5 gap-2">
                  <Search className="h-3.5 w-3.5" /> Start Searching
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {bookmarks.map((r, i) => (
                  <RepoCard
                    key={r.full_name}
                    r={r}
                    rank={i + 1}
                    onInspect={(name) => setInspectRepoName(name)}
                    isBookmarked={true}
                    onToggleBookmark={toggleBookmark}
                    onTopicClick={(t) => {
                      setQ(t)
                      run(t)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 7: FAQ & REST API ── */}
        {activeTab === 'faq' && (
          <div className="pt-8">
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Documentation & REST API</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                Frequently asked questions, system design details, and local API documentation.
              </p>
            </div>

            <Faq />
            <ApiDocsCard />
          </div>
        )}

        {/* Bottom Call to Action and Footer */}
        <CtaBand onSearch={scrollToSearch} />

        <Separator className="my-10" />

        <footer className="animate-fade-up text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                <span>© 2026 RepoRadar</span>
              </div>
              <span className="text-border">|</span>
              <span className="rounded bg-muted px-2 py-1 font-mono text-[10px]">BM25 + ONNX Vectors</span>
              <span className="text-border">|</span>
              <button onClick={() => setActiveTab('faq')} className="hover:text-primary">API Documentation</button>
              <button onClick={() => setActiveTab('how')} className="hover:text-primary">How It Works</button>
            </div>

            <div className="flex items-center gap-3">
              <a href="https://github.com/KarmSorathiya378/repordar" target="_blank" rel="noopener noreferrer" className="hover:text-primary" title="Source code">
                <GitBranch className="h-4 w-4" />
              </a>
              <a href="#faq" onClick={() => setActiveTab('faq')} className="hover:text-primary" title="FAQ">
                <HelpCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </footer>
      </main>

      <RepoDrawer
        repoName={inspectRepoName}
        onClose={() => setInspectRepoName(null)}
        onTopicClick={(t) => {
          setQ(t)
          run(t)
        }}
        langColor={langColor}
      />

      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onSelectSearch={(queryStr) => {
          setQ(queryStr)
          run(queryStr)
        }}
      />

      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={(fullName) => {
          setBookmarks((prev) => prev.filter((b) => b.full_name !== fullName))
        }}
        onClearAll={() => setBookmarks([])}
        onInspectRepo={(name) => {
          setIsBookmarksOpen(false)
          setInspectRepoName(name)
        }}
      />
    </div>
  )
}

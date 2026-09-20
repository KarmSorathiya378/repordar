import { useState, useEffect } from 'react'
import { X, ExternalLink, Star, GitFork, Shield, Calendar, Copy, Check, BookOpen, Code2, Terminal, Sparkles, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiRepoDetail, type RepoDetail } from '@/lib/api'

interface RepoDrawerProps {
  repoName: string | null
  onClose: () => void
  onTopicClick: (topic: string) => void
  langColor: (l: string | null) => string
}

export function RepoDrawer({ repoName, onClose, onTopicClick, langColor }: RepoDrawerProps) {
  const [detail, setDetail] = useState<RepoDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedClone, setCopiedClone] = useState(false)
  const [copiedReadme, setCopiedReadme] = useState(false)
  const [activeTab, setActiveTab] = useState<'readme' | 'metadata'>('readme')
  const [readmeSearch, setReadmeSearch] = useState('')

  useEffect(() => {
    if (!repoName) return
    setLoading(true)
    setError('')
    setDetail(null)
    apiRepoDetail(repoName)
      .then((d) => setDetail(d))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load repository README'))
      .finally(() => setLoading(false))
  }, [repoName])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!repoName) return null

  const cloneCmd = `git clone https://github.com/${repoName}.git`

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneCmd)
    setCopiedClone(true)
    setTimeout(() => setCopiedClone(false), 2000)
  }

  const handleCopyReadme = () => {
    if (!detail?.readme) return
    navigator.clipboard.writeText(detail.readme)
    setCopiedReadme(true)
    setTimeout(() => setCopiedReadme(false), 2000)
  }

  const filteredReadmeLines = detail?.readme
    ? detail.readme.split('\n').filter((l) =>
        readmeSearch ? l.toLowerCase().includes(readmeSearch.toLowerCase()) : true
      )
    : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm transition-opacity animate-fade-up">
      {/* backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      {/* Drawer content panel */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l bg-card shadow-2xl transition-transform">
        {/* Top Drawer Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Repository Inspector
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching full README & metadata for {repoName}…</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">⚠️</div>
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Inspector
            </Button>
          </div>
        ) : detail ? (
          <>
            {/* Repo Summary Panel */}
            <div className="border-b bg-muted/20 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    <a
                      href={detail.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline inline-flex items-center gap-1.5"
                    >
                      {detail.full_name}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{detail.description || 'No description provided.'}</p>
                </div>

                <a href={detail.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" /> Open GitHub
                  </Button>
                </a>
              </div>

              {/* Stats badges */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {detail.stars.toLocaleString()} stars
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground font-mono">
                  <GitFork className="h-3.5 w-3.5" />
                  {detail.forks.toLocaleString()} forks
                </span>
                {detail.language && (
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    <span className="mr-1.5 h-2 w-2 rounded-full" style={{ background: langColor(detail.language) }} />
                    {detail.language}
                  </Badge>
                )}
                {detail.license && (
                  <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                    <Shield className="mr-1 h-3 w-3" />
                    {detail.license}
                  </Badge>
                )}
                {detail.pushed_at && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                    <Calendar className="h-3 w-3" />
                    Pushed {detail.pushed_at.slice(0, 10)}
                  </span>
                )}
              </div>

              {/* Clone command strip */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate flex-1 select-all">{cloneCmd}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyClone} className="h-7 px-2 text-xs">
                  {copiedClone ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1">{copiedClone ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              {/* Topics */}
              {detail.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detail.topics.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        onTopicClick(t)
                        onClose()
                      }}
                      className="rounded border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab navigation */}
            <div className="flex items-center justify-between border-b px-6 pt-2">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('readme')}
                  className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                    activeTab === 'readme' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  README Preview ({detail.readme ? `${detail.readme.length.toLocaleString()} chars` : '0'})
                </button>
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                    activeTab === 'metadata' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Raw Info & Links
                </button>
              </div>

              {activeTab === 'readme' && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    placeholder="Search inside README…"
                    value={readmeSearch}
                    onChange={(e) => setReadmeSearch(e.target.value)}
                    className="h-7 rounded border px-2 font-mono text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyReadme} className="h-7 gap-1 px-2 text-xs">
                    {copiedReadme ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedReadme ? 'Copied' : 'Copy README'}
                  </Button>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'readme' ? (
                detail.readme ? (
                  <div className="rounded-xl border bg-muted/10 p-5 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words selection:bg-primary/20">
                    {filteredReadmeLines.join('\n')}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No README text recorded for this repository.
                  </div>
                )
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Full Repository Metadata</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
                      <div><dt className="text-muted-foreground">ID:</dt><dd>{detail.id || 'N/A'}</dd></div>
                      <div><dt className="text-muted-foreground">Stars:</dt><dd>{detail.stars.toLocaleString()}</dd></div>
                      <div><dt className="text-muted-foreground">Forks:</dt><dd>{detail.forks.toLocaleString()}</dd></div>
                      <div><dt className="text-muted-foreground">Language:</dt><dd>{detail.language || 'N/A'}</dd></div>
                      <div><dt className="text-muted-foreground">License:</dt><dd>{detail.license || 'N/A'}</dd></div>
                      <div><dt className="text-muted-foreground">Pushed:</dt><dd>{detail.pushed_at || 'N/A'}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Clone Instructions</h3>
                    <div className="mt-2 space-y-2 font-mono text-xs">
                      <div className="rounded border bg-muted p-2 select-all">git clone https://github.com/{detail.full_name}.git</div>
                      <div className="rounded border bg-muted p-2 select-all">git clone git@github.com:{detail.full_name}.git</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

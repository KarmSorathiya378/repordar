import { Filter, SlidersHorizontal, ArrowUpDown, Star, Code2, Download, Copy, Check, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { RepoResult } from '@/lib/api'

export interface FilterState {
  language: string
  minStars: number
  sortBy: 'rrf' | 'stars' | 'sem' | 'bm25'
  limit: number
}

interface FilterToolbarProps {
  filters: FilterState
  onChange: (fn: (prev: FilterState) => FilterState) => void
  onReset: () => void
  results: RepoResult[]
  query: string
}

const LANGUAGES = ['All', 'Python', 'TypeScript', 'Rust', 'Go', 'C++', 'JavaScript', 'Java', 'C#', 'PHP']
const STAR_OPTIONS = [
  { label: 'Any Stars', val: 0 },
  { label: '≥ 10 Stars', val: 10 },
  { label: '≥ 50 Stars', val: 50 },
  { label: '≥ 200 Stars', val: 200 },
  { label: '≥ 500 Stars', val: 500 },
  { label: '≥ 1,000 Stars', val: 1000 },
]

export function FilterToolbar({ filters, onChange, onReset, results, query }: FilterToolbarProps) {
  const [exported, setExported] = useState(false)

  const activeCount =
    (filters.language !== 'All' ? 1 : 0) +
    (filters.minStars > 0 ? 1 : 0) +
    (filters.sortBy !== 'rrf' ? 1 : 0) +
    (filters.limit !== 10 ? 1 : 0)

  const handleExportMarkdown = () => {
    if (!results.length) return
    let md = `# RepoRadar Search Results\n\n`
    md += `**Query:** \`${query}\`  \n`
    md += `**Total Results:** ${results.length}  \n`
    md += `**Generated:** ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC\n\n`
    md += `---\n\n`

    results.forEach((r, i) => {
      md += `### ${i + 1}. [${r.full_name}](${r.url})\n`
      md += `- **Stars:** ⭐ ${r.stars.toLocaleString()}\n`
      if (r.language) md += `- **Language:** \`${r.language}\`  \n`
      if (r.license) md += `- **License:** \`${r.license}\`  \n`
      if (r.description) md += `- **Description:** ${r.description}  \n`
      if (r.topics?.length) md += `- **Topics:** ${r.topics.map((t) => `\`#${t}\``).join(', ')}  \n`
      if (r.snippet) md += `\n> ${r.snippet.replace(/<[^>]+>/g, '')}\n`
      md += `\n`
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `repordar_${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <div className="rounded-xl border bg-card/70 p-3.5 shadow-sm backdrop-blur-sm animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left filter options */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Filters
          </span>

          {/* Language selector */}
          <select
            value={filters.language}
            onChange={(e) => onChange((prev) => ({ ...prev, language: e.target.value }))}
            className="h-8 rounded-lg border bg-background px-2.5 font-sans text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === 'All' ? 'All Languages' : l}
              </option>
            ))}
          </select>

          {/* Min Stars selector */}
          <select
            value={filters.minStars}
            onChange={(e) => onChange((prev) => ({ ...prev, minStars: Number(e.target.value) }))}
            className="h-8 rounded-lg border bg-background px-2.5 font-sans text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STAR_OPTIONS.map((opt) => (
              <option key={opt.val} value={opt.val}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort order selector */}
          <select
            value={filters.sortBy}
            onChange={(e) => onChange((prev) => ({ ...prev, sortBy: e.target.value as any }))}
            className="h-8 rounded-lg border bg-background px-2.5 font-sans text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="rrf">Sort: Best Match (RRF)</option>
            <option value="stars">Sort: Highest Stars</option>
            <option value="sem">Sort: Semantic Meaning</option>
            <option value="bm25">Sort: Keyword Score</option>
          </select>

          {/* Limit selector */}
          <select
            value={filters.limit}
            onChange={(e) => onChange((prev) => ({ ...prev, limit: Number(e.target.value) }))}
            className="h-8 rounded-lg border bg-background px-2.5 font-sans text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={10}>Show 10</option>
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
          </select>

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>

        {/* Right actions (Export) */}
        {results.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportMarkdown} className="h-8 gap-1.5 text-xs">
              {exported ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Download className="h-3.5 w-3.5" />}
              {exported ? 'Downloaded' : 'Export (.md)'}
            </Button>
          </div>
        )}
      </div>

      {/* Active filters badges */}
      {activeCount > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5 text-xs">
          <span className="text-[11px] text-muted-foreground">Active:</span>
          {filters.language !== 'All' && (
            <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
              lang: {filters.language}
              <button onClick={() => onChange((prev) => ({ ...prev, language: 'All' }))} className="hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {filters.minStars > 0 && (
            <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
              ★ ≥ {filters.minStars}
              <button onClick={() => onChange((prev) => ({ ...prev, minStars: 0 }))} className="hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {filters.sortBy !== 'rrf' && (
            <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
              sort: {filters.sortBy}
              <button onClick={() => onChange((prev) => ({ ...prev, sortBy: 'rrf' }))} className="hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

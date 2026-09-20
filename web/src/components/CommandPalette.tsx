import { useState, useEffect, useRef } from 'react'
import { Search, Radar, ArrowRight, X, Sparkles, Code2, Terminal, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelectSearch: (q: string) => void
}

const FEATURED_SUGGESTIONS = [
  { category: 'AI Agents & RAG', query: 'agentic workflow multi agent system python' },
  { category: 'AI Speech & TTS', query: 'kokoro tts fast neural voice python' },
  { category: 'Rust Infrastructure', query: 'rust axum web framework tower middleware' },
  { category: 'Go Microservices', query: 'go chi clean architecture microservices' },
  { category: 'Fullstack Next.js', query: 'nextjs 15 app router server actions auth' },
  { category: 'UI Animations', query: 'framer motion interactive animation react' },
  { category: 'Data & Databases', query: 'duckdb spatial vector search python' },
  { category: 'Security & eBPF', query: 'ebpf network packet filter monitor rust' },
]

export function CommandPalette({ isOpen, onClose, onSelectSearch }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelect = (q: string) => {
    onSelectSearch(q)
    onClose()
  }

  const filtered = FEATURED_SUGGESTIONS.filter(
    (s) => s.category.toLowerCase().includes(query.toLowerCase()) || s.query.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 pt-20 backdrop-blur-md animate-fade-up px-4">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleSelect(query.trim())
              }
            }}
            placeholder="Type any problem or search query… (Press Enter)"
            className="flex-1 bg-transparent font-sans text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden rounded border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
            ESC
          </kbd>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions list */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {query.trim() && (
            <button
              onClick={() => handleSelect(query.trim())}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Search radar for "{query}"</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended Problem Queries
          </div>

          <div className="space-y-1">
            {filtered.map((item) => (
              <button
                key={item.query}
                onClick={() => handleSelect(item.query)}
                className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                      {item.category}
                    </Badge>
                    <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {item.query}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Hybrid BM25 + ONNX Vectors
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>↑↓ to navigate</span>
            <span>↵ to search</span>
          </div>
        </div>
      </div>
    </div>
  )
}

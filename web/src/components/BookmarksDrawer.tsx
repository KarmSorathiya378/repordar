import { useState } from 'react'
import { X, Star, ExternalLink, Trash2, Download, Copy, Check, Terminal, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RepoResult } from '@/lib/api'

interface BookmarksDrawerProps {
  isOpen: boolean
  onClose: () => void
  bookmarks: RepoResult[]
  onRemoveBookmark: (fullName: string) => void
  onClearAll: () => void
  onInspectRepo: (fullName: string) => void
}

export function BookmarksDrawer({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onClearAll,
  onInspectRepo,
}: BookmarksDrawerProps) {
  const [copiedName, setCopiedName] = useState<string | null>(null)
  const [exported, setExported] = useState(false)

  if (!isOpen) return null

  const handleCopyClone = (fullName: string) => {
    navigator.clipboard.writeText(`git clone https://github.com/${fullName}.git`)
    setCopiedName(fullName)
    setTimeout(() => setCopiedName(null), 2000)
  }

  const handleExportBookmarks = () => {
    if (!bookmarks.length) return
    let md = `# Saved RepoRadar Repositories\n\n`
    md += `**Exported:** ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC\n\n`
    md += `---\n\n`

    bookmarks.forEach((r, i) => {
      md += `### ${i + 1}. [${r.full_name}](${r.url})\n`
      md += `- **Stars:** ⭐ ${r.stars.toLocaleString()}\n`
      if (r.language) md += `- **Language:** \`${r.language}\`  \n`
      if (r.description) md += `- **Description:** ${r.description}  \n`
      md += `- **Clone Command:** \`git clone https://github.com/${r.full_name}.git\`  \n\n`
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `repordar_saved_bookmarks.md`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-fade-up">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <BookMarked className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-sm">Saved Repositories ({bookmarks.length})</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Action bar */}
        {bookmarks.length > 0 && (
          <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-2.5 text-xs">
            <Button variant="outline" size="sm" onClick={handleExportBookmarks} className="h-7 gap-1 px-2.5 text-xs">
              {exported ? <Check className="h-3 w-3 text-emerald-500" /> : <Download className="h-3 w-3" />}
              {exported ? 'Exported' : 'Export (.md)'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs text-destructive hover:bg-destructive/10">
              Clear All
            </Button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Star className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 font-medium text-foreground">No saved repositories yet</p>
              <p className="mt-1 text-xs">Click the bookmark icon on any search result card to save it here for quick access.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((r) => (
                <div key={r.full_name} className="group rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        onClick={() => onInspectRepo(r.full_name)}
                        className="font-semibold text-sm text-foreground hover:text-primary hover:underline text-left block"
                      >
                        {r.full_name}
                      </button>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                          <Star className="h-3 w-3 fill-amber-400" /> {r.stars.toLocaleString()}
                        </span>
                        {r.language && <Badge variant="secondary" className="font-mono text-[10px]">{r.language}</Badge>}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveBookmark(r.full_name)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {r.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.description}</p>}

                  <div className="mt-3 flex items-center gap-2 pt-2 border-t text-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyClone(r.full_name)}
                      className="h-7 flex-1 gap-1 font-mono text-[11px]"
                    >
                      {copiedName === r.full_name ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiedName === r.full_name ? 'Copied' : 'git clone'}
                    </Button>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

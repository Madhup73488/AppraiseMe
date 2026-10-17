import { useEffect, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../utils/cn'
import { type CommandRegistry, type Command } from './command-registry'

export interface CommandPaletteProps {
  registry: CommandRegistry
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function CommandPalette({
  registry,
  open,
  onOpenChange,
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [commands, setCommands] = useState<Command[]>([])

  const refreshCommands = useCallback(() => {
    setCommands(registry.getAll())
  }, [registry])

  useEffect(() => {
    refreshCommands()
  }, [refreshCommands, open])

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.group?.toLowerCase().includes(q) ?? false)
    )
  })

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    const group = cmd.group ?? 'Commands'
    if (!acc[group]) acc[group] = []
    acc[group].push(cmd)
    return acc
  }, {})

  const flatFiltered = filtered

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flatFiltered[activeIndex]
      if (cmd) {
        cmd.perform()
        onOpenChange(false)
      }
    }
  }

  if (!open) return null

  let runningIndex = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none',
          className,
        )}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <Search className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="h-10 flex-1 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted focus-visible:outline-none"
            aria-label="Search commands"
          />
          <kbd className="rounded-xs border border-border-default px-1.5 py-0.5 text-xs text-fg-muted">
            Esc
          </kbd>
        </div>
        <div
          className="max-h-[300px] overflow-y-auto p-1"
          role="listbox"
          aria-label="Available commands"
        >
          {flatFiltered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-fg-muted">
              No commands found
            </div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group} className="mb-1">
                <div className="px-2 py-1 text-xs font-medium text-fg-muted">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  runningIndex++
                  const isActive = runningIndex === activeIndex
                  return (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(runningIndex)}
                      onClick={() => {
                        cmd.perform()
                        onOpenChange(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xs px-2 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none',
                        isActive
                          ? 'bg-bg-hover text-fg-primary'
                          : 'text-fg-secondary',
                      )}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-xs text-fg-muted">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

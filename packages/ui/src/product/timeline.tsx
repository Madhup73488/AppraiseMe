import { useMemo } from 'react'
import type { EntryCardData } from './entry-card'
import type { TimelineGroupData } from './timeline-group'
import { TimelineGroup } from './timeline-group'
import { ScrollArea } from '../primitives/scroll-area'
import { EmptyState } from './empty-state'
import { Skeleton } from '../primitives/skeleton'
import { Button } from '../primitives/button'
import { Plus } from 'lucide-react'

export interface TimelineProps {
  entries: EntryCardData[]
  loading?: boolean
  onClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onRetryAI?: (id: string) => void
  onNewEntry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

function groupByDate(entries: EntryCardData[]): TimelineGroupData[] {
  const groups = new Map<string, TimelineGroupData>()

  for (const entry of entries) {
    const date = new Date(entry.occurredAt)
    const dateKey = date.toDateString()
    const label = formatDateGroup(date)

    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateKey, label, entries: [] })
    }
    groups.get(dateKey)!.entries.push(entry)
  }

  return Array.from(groups.values())
}

function formatDateGroup(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

export function Timeline({
  entries,
  loading,
  onClick,
  onEdit,
  onDelete,
  onRetryAI,
  onNewEntry,
  emptyTitle = 'No entries yet',
  emptyDescription = 'Use Quick Capture below to log your first work update.',
  className,
}: TimelineProps) {
  const groups = useMemo(() => groupByDate(entries), [entries])

  if (loading) {
    return (
      <div className={className}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2 px-3 py-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            onNewEntry ? (
              <Button size="sm" onClick={onNewEntry}>
                <Plus className="h-3.5 w-3.5" />
                New entry
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <ScrollArea className={className}>
      <div className="mx-auto w-full max-w-3xl divide-y divide-border-subtle">
        {groups.map((group) => (
          <TimelineGroup
            key={group.date}
            group={group}
            onClick={onClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onRetryAI={onRetryAI}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

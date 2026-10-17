import { EntryCard, type EntryCardData } from './entry-card'

export interface TimelineGroupData {
  date: string
  label: string
  entries: EntryCardData[]
}

export interface TimelineGroupProps {
  group: TimelineGroupData
  onClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onRetryAI?: (id: string) => void
}

export function TimelineGroup({
  group,
  onClick,
  onEdit,
  onDelete,
  onRetryAI,
}: TimelineGroupProps) {
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border-subtle bg-bg-canvas/95 px-3 py-1.5 backdrop-blur">
        <span className="text-xs font-medium text-fg-secondary">
          {group.label}
        </span>
        <span className="text-xs text-fg-muted">
          {group.entries.length}{' '}
          {group.entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {group.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onClick={onClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onRetryAI={onRetryAI}
          />
        ))}
      </div>
    </div>
  )
}

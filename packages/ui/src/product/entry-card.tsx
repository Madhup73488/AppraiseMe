import { cn } from '../utils/cn'
import { Badge } from '../primitives/badge'
import { EntryAIStatus, type AIStatus } from './entry-ai-status'
import { formatRelativeTime } from '../utils/time'

export interface EntryCardData {
  id: string
  content: string
  entryType: string
  importance: number
  occurredAt: string
  aiStatus: string
  aiSummary: string | null
  projectName: string | null
  version: number
  /** AI-suggested taxonomy tags (from aiMetadata.suggested_tags) */
  suggestedTags?: string[]
}

export interface EntryCardProps {
  entry: EntryCardData
  onClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onRetryAI?: (id: string) => void
  className?: string
}

const entryTypeColors: Record<string, string> = {
  achievement: 'border-l-success',
  meeting: 'border-l-info',
  task: 'border-l-accent',
  other: 'border-l-border-subtle',
}

export function EntryCard({
  entry,
  onClick,
  onEdit,
  onDelete,
  onRetryAI,
  className,
}: EntryCardProps) {
  const aiStatus = entry.aiStatus as AIStatus

  return (
    <div
      onClick={() => onClick?.(entry.id)}
      className={cn(
        'group relative cursor-pointer border-l-2 bg-bg-surface px-3 py-2.5 transition-colors hover:bg-bg-hover',
        entryTypeColors[entry.entryType] || entryTypeColors.other,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg-primary">{entry.content}</p>
          {entry.aiSummary && (
            <p className="mt-1 text-xs text-fg-muted">{entry.aiSummary}</p>
          )}
          {entry.suggestedTags && entry.suggestedTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.suggestedTags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="px-1.5 py-0 text-[10px] font-medium lowercase"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {entry.importance > 0 && (
            <Badge variant="warning" className="text-xs">
              {entry.importance}
            </Badge>
          )}
          <EntryAIStatus status={aiStatus} />
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
        <span>{formatRelativeTime(entry.occurredAt)}</span>
        {entry.projectName && (
          <>
            <span>·</span>
            <span className="text-fg-secondary">{entry.projectName}</span>
          </>
        )}
        <span>·</span>
        <span className="capitalize">{entry.entryType}</span>
        {entry.version > 1 && (
          <>
            <span>·</span>
            <span>v{entry.version}</span>
          </>
        )}

        {(onEdit || onDelete || (onRetryAI && aiStatus === 'failed')) && (
          <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {onRetryAI && aiStatus === 'failed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryAI(entry.id)
                }}
                className="text-fg-muted hover:text-fg-primary"
                aria-label="Retry AI enrichment"
              >
                Retry AI
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(entry.id)
                }}
                className="text-fg-muted hover:text-fg-primary"
                aria-label="Edit entry"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(entry.id)
                }}
                className="text-fg-muted hover:text-danger"
                aria-label="Delete entry"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

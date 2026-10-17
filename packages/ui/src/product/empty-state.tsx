import { cn } from '../utils/cn'

export interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

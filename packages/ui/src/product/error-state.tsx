import { AlertCircle } from 'lucide-react'
import { cn } from '../utils/cn'

export interface ErrorStateProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 text-danger" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

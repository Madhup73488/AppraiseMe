import { CloudOff, RefreshCw, Check } from 'lucide-react'
import { cn } from '../utils/cn'
import { Badge } from '../primitives/badge'

export type SyncState =
  | { status: 'idle' }
  | { status: 'syncing' }
  | { status: 'synced' }
  | { status: 'offline' }
  | { status: 'failed'; message: string }

export interface SyncStatusProps {
  state: SyncState
  className?: string
}

export function SyncStatus({ state, className }: SyncStatusProps) {
  switch (state.status) {
    case 'idle':
      return (
        <Badge variant="default" className={cn('gap-1', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-fg-muted" />
          Idle
        </Badge>
      )
    case 'syncing':
      return (
        <Badge variant="info" className={cn('gap-1', className)}>
          <RefreshCw className="h-3 w-3 animate-spin motion-reduce:animate-none" />
          Syncing
        </Badge>
      )
    case 'synced':
      return (
        <Badge variant="success" className={cn('gap-1', className)}>
          <Check className="h-3 w-3" />
          Synced
        </Badge>
      )
    case 'offline':
      return (
        <Badge variant="warning" className={cn('gap-1', className)}>
          <CloudOff className="h-3 w-3" />
          Offline
        </Badge>
      )
    case 'failed':
      return (
        <Badge
          variant="danger"
          className={cn('gap-1', className)}
          title={state.message}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          Sync failed
        </Badge>
      )
  }
}

import { cn } from '../utils/cn'
import { Badge } from '../primitives/badge'
import { Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react'

export type AIStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EntryAIStatusProps {
  status: AIStatus
  className?: string
}

export function EntryAIStatus({ status, className }: EntryAIStatusProps) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="default" className={cn('gap-1', className)}>
          <Sparkles className="h-3 w-3 text-fg-muted" />
          AI pending
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="info" className={cn('gap-1', className)}>
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
          AI processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="success" className={cn('gap-1', className)}>
          <Check className="h-3 w-3" />
          AI enriched
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="danger" className={cn('gap-1', className)}>
          <AlertCircle className="h-3 w-3" />
          AI failed
        </Badge>
      )
  }
}

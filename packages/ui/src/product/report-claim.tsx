import { cn } from '../utils/cn'
import { Badge } from '../primitives/badge'

export interface ReportClaimData {
  id: string
  sectionKey: string
  claimText: string
  sortOrder: number
  evidence: Array<{
    entryId: string
    relevance: number
  }>
}

export interface ReportClaimProps {
  claim: ReportClaimData
  className?: string
}

export function ReportClaim({ claim, className }: ReportClaimProps) {
  const hasEvidence = claim.evidence.length > 0

  return (
    <div className={cn('py-1.5', className)}>
      <div className="flex items-start gap-2">
        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg-primary">{claim.claimText}</p>
          {hasEvidence && (
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="default" className="text-xs">
                {claim.evidence.length}{' '}
                {claim.evidence.length === 1 ? 'source' : 'sources'}
              </Badge>
            </div>
          )}
          {!hasEvidence && (
            <Badge variant="warning" className="mt-1 text-xs">
              No evidence
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

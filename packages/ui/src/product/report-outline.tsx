import { cn } from '../utils/cn'
import type { ReportClaimData } from './report-claim'
import { ReportClaim } from './report-claim'

export interface ReportSectionData {
  key: string
  title: string
  claims: ReportClaimData[]
}

export interface ReportOutlineProps {
  sections: ReportSectionData[]
  className?: string
}

export function ReportOutline({ sections, className }: ReportOutlineProps) {
  if (sections.length === 0) {
    return (
      <div className={cn('p-4 text-center text-sm text-fg-muted', className)}>
        No report sections
      </div>
    )
  }

  return (
    <div className={cn('divide-y divide-border-subtle', className)}>
      {sections.map((section) => (
        <div key={section.key} className="px-3 py-2">
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-secondary">
            {section.title}
          </h4>
          <div>
            {[...section.claims]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((claim) => (
                <ReportClaim key={claim.id} claim={claim} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

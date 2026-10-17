import { useState, useEffect } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Textarea } from '../primitives/textarea'
import { Badge } from '../primitives/badge'
import { ScrollArea } from '../primitives/scroll-area'
import { ReportOutline, type ReportSectionData } from './report-outline'
import { Skeleton } from '../primitives/skeleton'
import { FileText, Edit3, Eye } from 'lucide-react'

export interface ReportEditorData {
  id: string
  title: string
  reportType: string
  dateFrom: string
  dateTo: string
  style: string
  status: string
  contentMarkdown: string | null
  sections: ReportSectionData[]
  summary: string
}

export interface ReportEditorProps {
  report: ReportEditorData
  loading?: boolean
  onSave?: (id: string, contentMarkdown: string) => Promise<void>
  className?: string
}

export function ReportEditor({
  report,
  loading,
  onSave,
  className,
}: ReportEditorProps) {
  const [mode, setMode] = useState<'outline' | 'markdown'>('outline')
  const [markdown, setMarkdown] = useState(report.contentMarkdown || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMarkdown(report.contentMarkdown || '')
  }, [report.contentMarkdown])

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(report.id, markdown)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-3 p-4', className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-medium text-fg-primary">
            {report.title}
          </h3>
          <Badge variant="default" className="capitalize">
            {report.reportType}
          </Badge>
          <Badge variant="info" className="capitalize">
            {report.style}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'outline' ? 'primary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('outline')}
          >
            <Eye className="h-3 w-3" />
            Outline
          </Button>
          <Button
            variant={mode === 'markdown' ? 'primary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('markdown')}
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </Button>
          {onSave && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {mode === 'outline' ? (
          <div>
            {report.summary && (
              <div className="border-b border-border-subtle px-4 py-3">
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-secondary">
                  Summary
                </h4>
                <p className="text-sm text-fg-primary">{report.summary}</p>
              </div>
            )}
            <ReportOutline sections={report.sections} />
          </div>
        ) : (
          <div className="p-4">
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Edit report markdown..."
            />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

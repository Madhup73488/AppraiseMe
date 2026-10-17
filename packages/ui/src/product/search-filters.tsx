import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../primitives/select'
import { Filter } from 'lucide-react'

export interface SearchFiltersProject {
  id: string
  name: string
}

export interface SearchFiltersValue {
  projectId: string | null
  entryType: string | null
  tag: string | null
}

export interface SearchFiltersProps {
  value: SearchFiltersValue
  onChange: (value: SearchFiltersValue) => void
  projects: SearchFiltersProject[]
  className?: string
}

const ENTRY_TYPES = [
  { value: 'achievement', label: 'Achievement' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'other', label: 'Other' },
]

const TAGS = [
  { value: 'dev', label: 'Dev' },
  { value: 'client-call', label: 'Client call' },
  { value: 'rca', label: 'RCA' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'issue-fix', label: 'Issue fix' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'feature', label: 'Feature' },
  { value: 'support', label: 'Support' },
  { value: 'task', label: 'Task' },
]

export function SearchFilters({
  value,
  onChange,
  projects,
  className,
}: SearchFiltersProps) {
  const hasFilters = value.projectId || value.entryType || value.tag

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Filter className="h-3.5 w-3.5 text-fg-muted" />

      <Select
        value={value.projectId || 'all'}
        onValueChange={(v) =>
          onChange({ ...value, projectId: v === 'all' ? null : v })
        }
      >
        <SelectTrigger className="h-7 w-[140px] text-xs">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.entryType || 'all'}
        onValueChange={(v) =>
          onChange({ ...value, entryType: v === 'all' ? null : v })
        }
      >
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ENTRY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.tag || 'all'}
        onValueChange={(v) => onChange({ ...value, tag: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {TAGS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onChange({ projectId: null, entryType: null, tag: null })
          }
        >
          Clear
        </Button>
      )}
    </div>
  )
}

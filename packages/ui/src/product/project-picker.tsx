import { cn } from '../utils/cn'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../primitives/select'

export interface ProjectPickerProject {
  id: string
  name: string
}

export interface ProjectPickerProps {
  projects: ProjectPickerProject[]
  value: string | null
  onChange: (projectId: string | null) => void
  className?: string
}

export function ProjectPicker({
  projects,
  value,
  onChange,
  className,
}: ProjectPickerProps) {
  return (
    <Select
      value={value || 'none'}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="No project" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No project</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import { useState, useEffect } from 'react'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import { Textarea } from '../primitives/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../primitives/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../primitives/dialog'

export interface EntryEditorProject {
  id: string
  name: string
}

export interface EntryEditorData {
  id: string
  content: string
  entryType: string
  projectId: string | null
  importance: number
}

export interface EntryEditorProps {
  entry: EntryEditorData
  projects: EntryEditorProject[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    id: string,
    data: {
      content: string
      entryType: string
      projectId: string | null
      importance: number
    },
  ) => Promise<void>
}

const ENTRY_TYPES = [
  { value: 'other', label: 'Other' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
]

export function EntryEditor({
  entry,
  projects,
  open,
  onOpenChange,
  onSave,
}: EntryEditorProps) {
  const [content, setContent] = useState(entry.content)
  const [entryType, setEntryType] = useState(entry.entryType)
  const [projectId, setProjectId] = useState(entry.projectId || 'none')
  const [importance, setImportance] = useState(String(entry.importance))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setContent(entry.content)
      setEntryType(entry.entryType)
      setProjectId(entry.projectId || 'none')
      setImportance(String(entry.importance))
    }
  }, [open, entry])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(entry.id, {
        content,
        entryType,
        projectId: projectId === 'none' ? null : projectId,
        importance: parseInt(importance, 10) || 0,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entry-content">Content</Label>
            <Textarea
              id="entry-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-importance">Importance (0-10)</Label>
            <Input
              id="entry-importance"
              type="number"
              min={0}
              max={10}
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

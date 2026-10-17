import { useEffect, useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../primitives/dialog'

export interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void | Promise<void>
  className?: string
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
  className,
}: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setCreating(false)
    }
  }, [open])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      await onCreate(trimmed)
      onOpenChange(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-sm', className)}>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a project to organize your work entries.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="grid gap-2"
        >
          <Label htmlFor="new-project-name">Project name</Label>
          <Input
            id="new-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Payments revamp"
            autoFocus
            disabled={creating}
          />
        </form>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={creating || name.trim().length === 0}
          >
            {creating ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

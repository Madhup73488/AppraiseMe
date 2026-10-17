import { useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Label } from '../primitives/label'
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
import { Download, Copy, Check } from 'lucide-react'

export type ExportFormat = 'markdown' | 'text' | 'json' | 'pdf' | 'docx'

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: ExportFormat) => void
  onCopy: () => Promise<boolean>
  className?: string
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  onCopy,
  className,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await onCopy()
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(className)}>
        <DialogHeader>
          <DialogTitle>Export report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="text">Plain text (.txt)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="docx">Word document (.docx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          {format !== 'pdf' && format !== 'docx' && (
            <Button variant="ghost" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy to clipboard
                </>
              )}
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onExport(format)}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

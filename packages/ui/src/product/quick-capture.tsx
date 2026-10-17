import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { Badge } from '../primitives/badge'
import { SyncStatus, type SyncState } from './sync-status'

export interface QuickCaptureProps {
  onSave: (content: string) => void
  syncState?: SyncState
  placeholder?: string
  /** Optional voice-capture control rendered beside the input */
  children?: ReactNode
  className?: string
}

export function QuickCapture({
  onSave,
  syncState = { status: 'idle' },
  placeholder = 'What did you just do?',
  children,
  className,
}: QuickCaptureProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    onSave(trimmed)
    setContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setContent('')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-border-subtle bg-bg-surface px-3 py-2',
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        aria-label="Quick capture"
        className="flex-1 resize-none bg-transparent text-sm text-fg-primary placeholder:text-fg-muted focus-visible:outline-none"
      />
      {children}
      <div className="flex items-center gap-2">
        <SyncStatus state={syncState} />
        <Badge variant="default" className="hidden sm:inline-flex">
          <kbd className="mr-0.5">↵</kbd>
          to save
        </Badge>
      </div>
    </div>
  )
}

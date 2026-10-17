import { forwardRef } from 'react'
import { cn } from '../utils/cn'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none resize-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

import { forwardRef } from 'react'
import { cn } from '../utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-8 w-full rounded-md border border-border-default bg-bg-surface px-3 text-sm text-fg-primary placeholder:text-fg-muted transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

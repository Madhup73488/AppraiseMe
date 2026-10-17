import { forwardRef } from 'react'
import { cn } from '../utils/cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'

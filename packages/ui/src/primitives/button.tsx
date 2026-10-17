import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils/cn'

const variants = {
  primary:
    'bg-accent text-fg-inverse hover:bg-accent-hover focus-visible:ring-focus-ring',
  secondary:
    'bg-bg-elevated text-fg-primary hover:bg-bg-hover border border-border-default focus-visible:ring-focus-ring',
  ghost:
    'bg-transparent text-fg-secondary hover:bg-bg-hover hover:text-fg-primary focus-visible:ring-focus-ring',
  danger:
    'bg-danger text-fg-inverse hover:bg-danger/90 focus-visible:ring-danger',
} as const

const sizes = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
  icon: 'h-8 w-8 p-0',
} as const

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

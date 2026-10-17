import { cn } from '../utils/cn'

const variants = {
  default: 'bg-bg-elevated text-fg-secondary border-border-default',
  accent: 'bg-accent-muted text-accent border-transparent',
  success: 'bg-success/10 text-success border-transparent',
  warning: 'bg-warning/10 text-warning border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
  info: 'bg-info/10 text-info border-transparent',
} as const

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs border px-1.5 py-0.5 text-xs font-medium transition-colors duration-150',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

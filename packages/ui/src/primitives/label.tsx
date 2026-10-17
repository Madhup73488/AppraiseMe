import { forwardRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../utils/cn'

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium text-fg-primary select-none', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

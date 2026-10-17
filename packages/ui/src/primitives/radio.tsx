import { forwardRef } from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '../utils/cn'

export const RadioGroup = forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('flex flex-col gap-2', className)}
    {...props}
  />
))
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

export const RadioGroupItem = forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 shrink-0 rounded-full border border-border-strong bg-bg-surface transition-colors duration-150 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent motion-reduce:transition-none',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-accent" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

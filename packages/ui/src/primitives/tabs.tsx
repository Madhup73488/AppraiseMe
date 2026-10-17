import { forwardRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../utils/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center gap-1 rounded-md bg-bg-elevated p-0.5',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xs px-2.5 py-1 text-xs font-medium text-fg-secondary transition-colors duration-150 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-bg-surface data-[state=active]:text-fg-primary motion-reduce:transition-none',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 focus-visible:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

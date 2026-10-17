import { forwardRef } from 'react'
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../utils/cn'

export const Menu = MenuPrimitive.Root
export const MenuTrigger = MenuPrimitive.Trigger

export const MenuContent = forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border border-border-default bg-bg-elevated p-1 text-fg-secondary shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none motion-reduce:data-[state=closed]:animate-none',
        className,
      )}
      {...props}
    />
  </MenuPrimitive.Portal>
))
MenuContent.displayName = MenuPrimitive.Content.displayName

export const MenuItem = forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm outline-none transition-colors duration-150 focus:bg-bg-hover focus:text-fg-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 motion-reduce:transition-none',
      className,
    )}
    {...props}
  />
))
MenuItem.displayName = MenuPrimitive.Item.displayName

export const MenuSeparator = forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border-subtle', className)}
    {...props}
  />
))
MenuSeparator.displayName = MenuPrimitive.Separator.displayName

export const MenuLabel = forwardRef<
  React.ComponentRef<typeof MenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1 text-xs font-medium text-fg-muted', className)}
    {...props}
  />
))
MenuLabel.displayName = MenuPrimitive.Label.displayName

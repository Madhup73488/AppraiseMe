import { X } from 'lucide-react'
import { cn } from '../utils/cn'
import { IconButton } from '../primitives/icon-button'

export interface WorkspaceTab {
  id: string
  label: string
}

export interface WorkspaceTabsProps {
  tabs: WorkspaceTab[]
  activeTab: string
  onTabChange: (id: string) => void
  onTabClose?: (id: string) => void
  className?: string
}

export function WorkspaceTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  className,
}: WorkspaceTabsProps) {
  return (
    <div
      className={cn(
        'flex h-9 items-center gap-0.5 border-b border-border-subtle bg-bg-surface px-1',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'group flex h-7 items-center gap-1.5 rounded-xs px-2.5 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none',
              isActive
                ? 'bg-bg-elevated text-fg-primary'
                : 'text-fg-secondary hover:bg-bg-hover hover:text-fg-primary',
            )}
          >
            <span className="max-w-[120px] truncate">{tab.label}</span>
            {onTabClose && (
              <IconButton
                label={`Close ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className="h-4 w-4 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </IconButton>
            )}
          </button>
        )
      })}
    </div>
  )
}

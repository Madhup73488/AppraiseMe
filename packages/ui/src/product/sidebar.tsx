import {
  Clock,
  FolderKanban,
  Trophy,
  Sparkles,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/tooltip'

export interface SidebarProps {
  activeItem?: string
  onItemClick?: (id: string) => void
  collapsed?: boolean
  className?: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const navItems: NavItem[] = [
  { id: 'today', label: 'Today', icon: Clock, group: 'HOME' },
  { id: 'timeline', label: 'Timeline', icon: Clock, group: 'HOME' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'WORK' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, group: 'WORK' },
  { id: 'ask', label: 'Ask', icon: Sparkles, group: 'INTELLIGENCE' },
  { id: 'weekly', label: 'Weekly', icon: FileText, group: 'REPORTS' },
  { id: 'monthly', label: 'Monthly', icon: FileText, group: 'REPORTS' },
  { id: 'appraisal', label: 'Appraisal', icon: FileText, group: 'REPORTS' },
  { id: 'settings', label: 'Settings', icon: Settings, group: '' },
]

export function Sidebar({
  activeItem = 'today',
  onItemClick,
  collapsed = false,
  className,
}: SidebarProps) {
  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group || 'SYSTEM'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-150 motion-reduce:transition-none',
        collapsed ? 'w-12' : 'w-44',
        className,
      )}
    >
      <nav className="flex-1 overflow-y-auto py-1.5" aria-label="Main navigation">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-1">
            {!collapsed && (
              <div className="px-3 py-1 text-[10px] font-medium tracking-wider text-fg-muted uppercase">
                {group}
              </div>
            )}
            {items.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              const button = (
                <button
                  onClick={() => onItemClick?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none',
                    collapsed && 'justify-center',
                    isActive
                      ? 'bg-bg-active text-fg-primary'
                      : 'text-fg-secondary hover:bg-bg-hover hover:text-fg-primary',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
              return collapsed ? (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <div className="px-1 py-0.5">{button}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.id} className="px-1 py-0.5">
                  {button}
                </div>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

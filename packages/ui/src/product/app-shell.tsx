import { useEffect, useState } from 'react'
import { cn } from '../utils/cn'
import { Sidebar, type SidebarProps } from './sidebar'
import { WorkspaceTabs, type WorkspaceTabsProps } from './workspace-tabs'
import { QuickCapture, type QuickCaptureProps } from './quick-capture'
import { CommandPalette, type CommandPaletteProps } from './command-palette'
import { IconButton } from '../primitives/icon-button'
import { Logo } from './logo'
import {
  Search,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

export interface AppShellProps {
  children: React.ReactNode
  sidebar: SidebarProps
  workspaceTabs: WorkspaceTabsProps
  quickCapture: QuickCaptureProps
  commandPalette: CommandPaletteProps
  onSearchClick?: () => void
  onSettingsClick?: () => void
  onAISettingsClick?: () => void
  className?: string
}

export function AppShell({
  children,
  sidebar,
  workspaceTabs,
  quickCapture,
  commandPalette,
  onSearchClick,
  onSettingsClick,
  onAISettingsClick,
  className,
}: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(commandPalette.open)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    setPaletteOpen(commandPalette.open)
  }, [commandPalette.open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className={cn(
        'flex h-screen w-full flex-col overflow-hidden bg-bg-canvas text-fg-primary',
        className,
      )}
    >
      <header className="flex h-9 items-center justify-between border-b border-border-subtle bg-bg-surface px-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 pl-1">
            <Logo size={16} />
            <span className="text-xs font-semibold tracking-wide text-fg-primary">
              AppraiseMe
            </span>
          </span>
          <IconButton
            label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((c) => !c)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label="Search (Cmd+K)"
            onClick={onSearchClick ?? (() => setPaletteOpen(true))}
          >
            <Search className="h-4 w-4" />
          </IconButton>
          {onAISettingsClick && (
            <IconButton label="AI provider settings" onClick={onAISettingsClick}>
              <Sparkles className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Settings" onClick={onSettingsClick}>
            <Settings className="h-4 w-4" />
          </IconButton>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar {...sidebar} collapsed={sidebarCollapsed} />
        <main className="flex flex-1 flex-col overflow-hidden">
          <WorkspaceTabs {...workspaceTabs} />
          <div className="flex-1 overflow-y-auto">{children}</div>
          <QuickCapture {...quickCapture} />
        </main>
      </div>
      <CommandPalette
        registry={commandPalette.registry}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  )
}

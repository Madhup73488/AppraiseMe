export { cn } from './utils/cn'

export { Button, type ButtonProps } from './primitives/button'
export { IconButton, type IconButtonProps } from './primitives/icon-button'
export { Input, type InputProps } from './primitives/input'
export { Textarea, type TextareaProps } from './primitives/textarea'
export { Checkbox } from './primitives/checkbox'
export { RadioGroup, RadioGroupItem } from './primitives/radio'
export { Switch } from './primitives/switch'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectLabel,
} from './primitives/select'
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './primitives/tooltip'
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from './primitives/popover'
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './primitives/dialog'
export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuLabel,
} from './primitives/menu'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives/tabs'
export { Separator } from './primitives/separator'
export { Badge, type BadgeProps } from './primitives/badge'
export { Avatar, AvatarImage, AvatarFallback } from './primitives/avatar'
export { ScrollArea, ScrollBar } from './primitives/scroll-area'
export { Label } from './primitives/label'
export { Skeleton, type SkeletonProps } from './primitives/skeleton'

export { EmptyState, type EmptyStateProps } from './product/empty-state'
export { ErrorState, type ErrorStateProps } from './product/error-state'
export {
  SyncStatus,
  type SyncStatusProps,
  type SyncState,
} from './product/sync-status'
export {
  createCommandRegistry,
  type Command,
  type CommandRegistry,
} from './product/command-registry'
export {
  CommandPalette,
  type CommandPaletteProps,
} from './product/command-palette'
export { QuickCapture, type QuickCaptureProps } from './product/quick-capture'
export { Sidebar, type SidebarProps } from './product/sidebar'
export {
  WorkspaceTabs,
  type WorkspaceTabsProps,
} from './product/workspace-tabs'
export { AppShell, type AppShellProps } from './product/app-shell'

export { EntryAIStatus, type AIStatus } from './product/entry-ai-status'
export {
  EntryCard,
  type EntryCardData,
  type EntryCardProps,
} from './product/entry-card'
export {
  EntryEditor,
  type EntryEditorData,
  type EntryEditorProject,
  type EntryEditorProps,
} from './product/entry-editor'
export { Timeline, type TimelineProps } from './product/timeline'
export {
  TimelineGroup,
  type TimelineGroupData,
  type TimelineGroupProps,
} from './product/timeline-group'
export {
  ProjectPicker,
  type ProjectPickerProject,
  type ProjectPickerProps,
} from './product/project-picker'
export { SearchBar, type SearchBarProps } from './product/search-bar'
export {
  SearchFilters,
  type SearchFiltersValue,
  type SearchFiltersProps,
} from './product/search-filters'

export {
  ReportClaim,
  type ReportClaimData,
  type ReportClaimProps,
} from './product/report-claim'
export {
  ReportOutline,
  type ReportSectionData,
  type ReportOutlineProps,
} from './product/report-outline'
export {
  ReportEditor,
  type ReportEditorData,
  type ReportEditorProps,
} from './product/report-editor'
export {
  ExportDialog,
  type ExportFormat,
  type ExportDialogProps,
} from './product/export-dialog'
export {
  ConnectionSettingsDialog,
  type ConnectionSettingsDialogProps,
  type DataConnectionType,
} from './product/connection-settings-dialog'
export {
  AIConnectionSettingsDialog,
  type AIConnectionSettingsDialogProps,
  type AIConnectionConfig,
  type AIConnectionHealth,
  type AIProviderId,
} from './product/ai-connection-settings-dialog'

export {
  ThemePicker,
  THEMES,
  type Theme,
  type ThemePickerProps,
} from './product/theme-picker'
export {
  OnboardingFlow,
  type OnboardingData,
  type OnboardingFlowProps,
  type OnboardingStep,
} from './product/onboarding-flow'
export {
  NewProjectDialog,
  type NewProjectDialogProps,
} from './product/new-project-dialog'
export { DatabaseGate, type DatabaseGateProps } from './product/database-gate'
export {
  VoiceCaptureButton,
  type VoiceCaptureButtonProps,
} from './product/voice-capture-button'
export { Logo, type LogoProps } from './product/logo'
export {
  LoadingScreen,
  type LoadingScreenProps,
} from './product/loading-screen'
export {
  TypewriterText,
  type TypewriterTextProps,
} from './product/typewriter-text'

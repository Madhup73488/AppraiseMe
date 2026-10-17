# UI/UX & Design System

## 1. Experience goal

The product should feel like a premium modern desktop tool: focused,
dense, responsive and keyboard-first. Take inspiration from the quality
of OpenCode Desktop's pane structure, tabs, review surfaces and
restrained dark UI, but create an original Worklog identity.

Avoid: - oversized SaaS cards everywhere - excessive gradients/glass
effects - huge empty dashboard hero areas - excessive rounded
containers - slow animated transitions - modal-heavy workflows -
decorative AI sparkles on every feature

Prefer: - split panes - compact navigation - strong typography - subtle
borders - contextual toolbars - command palette - inline editing -
excellent focus states - predictable shortcuts - instant feedback

## 2. Desktop information architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Workspace / tabs                                      Search ⚙  │
├────────────────┬─────────────────────────────────────────────────┤
│ HOME           │                                                 │
│ Today          │ Main content                                    │
│ Timeline       │                                                 │
│                │ Timeline / Project / Report / Ask                │
│ WORK           │                                                 │
│ Projects       │                                                 │
│ Achievements   │                                                 │
│                │                                                 │
│ INTELLIGENCE   │                                                 │
│ Ask            │                                                 │
│ Insights       │                                                 │
│                │                                                 │
│ REPORTS        │                                                 │
│ Weekly         │                                                 │
│ Monthly        ├─────────────────────────────────────────────────┤
│ Appraisal      │ Quick capture / contextual command input        │
└────────────────┴─────────────────────────────────────────────────┘
```

A right-side detail/review pane may appear for: - entry details -
evidence - report claim sources - project details - AI enrichment review

## 3. Quick Capture

This is the product's most important interaction.

Requirements: - global shortcut on desktop - opens focused input
immediately - no mandatory metadata - Enter behavior must be
predictable; multiline shortcut documented - save locally first -
visible but unobtrusive sync/AI status - recently used project/type can
be suggested, never required - Escape dismisses safely - draft survives
accidental dismissal where appropriate

## 4. Command palette

Use `Cmd/Ctrl + K`.

Commands: - New entry - Search work - Open project - Generate report -
Generate appraisal - Switch theme - Open settings - Test connection -
Sync now - Keyboard shortcuts

Commands should be registered through a reusable command registry rather
than hard-coded into the palette component.

## 5. Themes

Ship five curated themes:

### Worklog

Default brand theme. Neutral professional dark/light pairing, restrained
accent.

### Midnight

Deep dark, high contrast, developer-friendly.

### Paper

Warm light surface, journal-like reading experience. Do not sacrifice
accessibility.

### Minimal

Low-chrome, spacious but not wasteful.

### Terminal

Monospace-forward and dense. Still use accessible controls; it is a
visual theme, not a fake terminal.

## 6. Semantic design tokens

Components never reference theme-specific literal colors.

```css
--bg-canvas
--bg-surface
--bg-elevated
--bg-hover
--bg-active

--fg-primary
--fg-secondary
--fg-muted
--fg-inverse

--border-subtle
--border-default
--border-strong

--accent
--accent-hover
--accent-muted

--success
--warning
--danger
--info

--focus-ring

--radius-xs
--radius-sm
--radius-md
--radius-lg

--space-1 ... --space-12
```

Prefer semantic tokens over arbitrary Tailwind color utilities inside
reusable components.

## 7. Component hierarchy

### Primitives

Button, IconButton, Input, Textarea, Checkbox, Radio, Switch, Select,
Tooltip, Popover, Dialog, Menu, Tabs, Separator, Badge, Avatar,
ScrollArea.

### Product components

- AppShell
- Sidebar
- WorkspaceTabs
- CommandPalette
- QuickCapture
- EntryCard
- EntryEditor
- EntryMetadata
- EntryAIStatus
- Timeline
- TimelineGroup
- ProjectPicker
- ProjectList
- AchievementCard
- ImpactEditor
- SearchBar
- SearchFilters
- AskComposer
- EvidenceList
- EvidencePeek
- ReportEditor
- ReportOutline
- ReportClaim
- ExportDialog
- ConnectionCard
- ProviderPicker
- CredentialField
- ThemePicker
- SyncStatus
- EmptyState
- ErrorState
- Skeleton

Product components compose primitives. Avoid page-specific copies of
buttons, dialogs and inputs.

## 8. Layout rules

- desktop sidebar should remain compact
- support resizable panes where useful
- remember pane widths locally
- use max reading width for long report prose
- timelines may use wider content
- do not center everything in a narrow marketing-style column
- mobile/web responsive layout may collapse sidebar to drawer
- avoid horizontal scroll except intentional code/table surfaces

## 9. Motion

Motion should communicate state: - 100--180ms for small transitions -
respect `prefers-reduced-motion` - no long page entrance animations - no
animation on every list item - quick capture should appear immediately

## 10. Accessibility

- WCAG-minded contrast
- visible keyboard focus
- semantic HTML
- labels for icon-only controls
- no color-only status
- logical tab order
- escape handling for overlays
- focus trapping for true modal dialogs
- screen-reader status for save/sync failures
- minimum practical hit targets
- reduced motion support

## 11. Loading states

Prefer: 1. cached content 2. optimistic content 3. local skeleton for
unknown content

Avoid full-page spinners for normal navigation.

## 12. Empty states

Every major surface needs a useful empty state: - no entries → explain
Quick Capture + shortcut - no projects → offer create or let AI infer
later - no reports → generate first report - no AI connection → explain
BYOK - no data connection → onboarding action - search no results →
preserve query and suggest filter changes

## 13. Error design

Errors must state: - what failed - whether user data is safe - what
action is available

Examples: - "Saved locally. Sync to Neon failed. Retry" - "Entry saved.
AI enrichment failed. Re-run" - "Database schema is outdated. Review
migration"

Never display raw connection strings, API keys or provider error bodies
containing secrets.

## 14. Responsive web

Desktop is flagship, but web remains first-class: - \>= 1280:
multi-pane - tablet: collapsible sidebar + primary pane - mobile: single
pane, bottom/compact navigation if later supported

Do not let desktop assumptions make the web unusable.

## 15. Visual QA checklist

Before accepting a screen: - consistent spacing/token usage - keyboard
usable - no accidental layout shift - empty/loading/error states - light
and dark themes - long content - long project names - 1000+ entry
timeline behavior - 125%/150% scaling - narrow window - reduced motion

import { cn } from '../utils/cn'

export interface Theme {
  id: string
  name: string
  description: string
  preview: {
    bg: string
    bgSecondary: string
    fg: string
    accent: string
    border: string
  }
}

export const THEMES: Theme[] = [
  {
    id: 'appraiseme',
    name: 'AppraiseMe',
    description: 'Balanced dark theme',
    preview: {
      bg: '#1a1a1f',
      bgSecondary: '#22222a',
      fg: '#e8e8ec',
      accent: '#6b8afd',
      border: '#3a3a46',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep dark with purple accents',
    preview: {
      bg: '#0d0d12',
      bgSecondary: '#14141c',
      fg: '#f0f0f5',
      accent: '#7c7cff',
      border: '#2e2e42',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Warm light with earthy tones',
    preview: {
      bg: '#f7f3ed',
      bgSecondary: '#fdfbf7',
      fg: '#2c2418',
      accent: '#8b6914',
      border: '#d8ccb4',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Neutral minimal, understated',
    preview: {
      bg: '#18181b',
      bgSecondary: '#1e1e22',
      fg: '#e4e4e7',
      accent: '#a1a1aa',
      border: '#36363f',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Green-on-black developer style',
    preview: {
      bg: '#0c0c0c',
      bgSecondary: '#111111',
      fg: '#e0e0e0',
      accent: '#50fa7b',
      border: '#2a2a2a',
    },
  },
]

export interface ThemePickerProps {
  value: string
  onChange: (themeId: string) => void
  className?: string
}

export function ThemePicker({ value, onChange, className }: ThemePickerProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {THEMES.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          selected={theme.id === value}
          onSelect={() => onChange(theme.id)}
        />
      ))}
    </div>
  )
}

interface ThemeCardProps {
  theme: Theme
  selected: boolean
  onSelect: () => void
}

function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors',
        selected
          ? 'border-accent bg-bg-elevated'
          : 'border-border-subtle bg-bg-surface hover:border-border-default',
      )}
    >
      <div
        className="h-16 w-full overflow-hidden rounded-[var(--radius-xs)] border"
        style={{ borderColor: theme.preview.border }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1"
          style={{
            backgroundColor: theme.preview.bgSecondary,
            borderBottom: `1px solid ${theme.preview.border}`,
          }}
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: theme.preview.fg, opacity: 0.3 }}
          />
          <span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: theme.preview.fg, opacity: 0.3 }}
          />
        </div>
        <div
          className="flex gap-1 p-1"
          style={{ backgroundColor: theme.preview.bg }}
        >
          <div
            className="h-12 w-1/3 rounded-[1px] p-[2px] flex flex-col gap-[2px]"
            style={{ backgroundColor: theme.preview.bgSecondary }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[3px] rounded-[1px]"
                style={{
                  backgroundColor: theme.preview.fg,
                  opacity: 0.2 + i * 0.1,
                }}
              />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-[2px]">
            <div
              className="h-[18px] rounded-[1px] flex items-center pl-1"
              style={{ backgroundColor: theme.preview.bgSecondary }}
            >
              <div
                className="h-[3px] w-1/2 rounded-[1px]"
                style={{ backgroundColor: theme.preview.fg, opacity: 0.35 }}
              />
            </div>
            <div
              className="h-[18px] rounded-[1px] flex items-center pl-1"
              style={{ backgroundColor: theme.preview.bgSecondary }}
            >
              <div
                className="h-[3px] w-2/5 rounded-[1px]"
                style={{ backgroundColor: theme.preview.accent }}
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-fg-primary">{theme.name}</p>
        <p className="text-xs text-fg-muted">{theme.description}</p>
      </div>
    </button>
  )
}

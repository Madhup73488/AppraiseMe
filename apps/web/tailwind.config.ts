import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-canvas': 'var(--bg-canvas)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'fg-primary': 'var(--fg-primary)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        'fg-inverse': 'var(--fg-inverse)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-muted': 'var(--accent-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        'focus-ring': 'var(--focus-ring)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
        8: 'var(--space-8)',
        9: 'var(--space-9)',
        10: 'var(--space-10)',
        11: 'var(--space-11)',
        12: 'var(--space-12)',
      },
    },
  },
  plugins: [animate],
}

export default config

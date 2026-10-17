export const THEME_NAMES = [
  'appraiseme',
  'midnight',
  'paper',
  'minimal',
  'terminal',
] as const

export type ThemeName = (typeof THEME_NAMES)[number]

export const DEFAULT_THEME: ThemeName = 'appraiseme'

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { THEME_NAMES, DEFAULT_THEME } from './index.js'

const tokensCss = readFileSync(join(__dirname, 'tokens.css'), 'utf-8')

const CORE_TOKENS = [
  '--bg-canvas',
  '--bg-surface',
  '--bg-elevated',
  '--bg-hover',
  '--bg-active',
  '--fg-primary',
  '--fg-secondary',
  '--fg-muted',
  '--fg-inverse',
  '--border-subtle',
  '--border-default',
  '--border-strong',
  '--accent',
  '--accent-hover',
  '--accent-muted',
  '--success',
  '--warning',
  '--danger',
  '--info',
  '--focus-ring',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
]

describe('themes', () => {
  it('exposes the five documented themes', () => {
    expect(THEME_NAMES).toEqual([
      'appraiseme',
      'midnight',
      'paper',
      'minimal',
      'terminal',
    ])
  })

  it('defaults to the brand theme', () => {
    expect(DEFAULT_THEME).toBe('appraiseme')
  })

  it('defines a css block for every theme', () => {
    for (const theme of THEME_NAMES) {
      expect(tokensCss).toContain(`[data-theme='${theme}']`)
    }
  })

  it('defines all core semantic tokens in :root', () => {
    const rootStart = tokensCss.indexOf(':root')
    const rootEnd = tokensCss.indexOf('}', rootStart)
    const rootBlock = tokensCss.slice(rootStart, rootEnd)
    for (const token of CORE_TOKENS) {
      expect(rootBlock).toContain(token)
    }
  })

  it('defines the spacing scale', () => {
    for (let i = 1; i <= 12; i++) {
      expect(tokensCss).toContain(`--space-${i}`)
    }
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act, createElement } from 'react'
import { Sidebar } from './sidebar'
import { AppShell } from './app-shell'
import { createCommandRegistry } from './command-registry'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Sidebar', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders groups and collapses via prop', () => {
    act(() => {
      root.render(
        createElement(Sidebar, { activeItem: 'today', onItemClick: () => {} }),
      )
    })

    expect(container.querySelector('nav')).not.toBeNull()
    expect(container.textContent).toContain('HOME')
    expect(container.querySelector('aside')?.classList.contains('w-44')).toBe(
      true,
    )

    act(() => {
      root.render(
        createElement(Sidebar, {
          activeItem: 'today',
          onItemClick: () => {},
          collapsed: true,
        }),
      )
    })

    expect(container.querySelector('aside')?.classList.contains('w-12')).toBe(
      true,
    )
    expect(container.textContent).not.toContain('HOME')
  })
})

describe('AppShell', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function renderShell() {
    act(() => {
      root.render(
        createElement(AppShell, {
          sidebar: { activeItem: 'today', onItemClick: () => {} },
          workspaceTabs: {
            tabs: [{ id: 'today', label: 'Today' }],
            activeTab: 'today',
            onTabChange: () => {},
          },
          quickCapture: { onSave: () => {} },
          commandPalette: {
            registry: createCommandRegistry(),
            open: false,
            onOpenChange: () => {},
          },
          children: createElement('div', null, 'page'),
        }),
      )
    })
  }

  it('shows the brand in the header and toggles the sidebar', () => {
    renderShell()

    expect(container.textContent).toContain('AppraiseMe')
    // brand row + toggle live in the header, not inside the sidebar
    expect(
      container.querySelector('aside')?.textContent ?? '',
    ).not.toContain('AppraiseMe')

    const collapseBtn = container.querySelector(
      'button[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement
    expect(collapseBtn).not.toBeNull()

    act(() => {
      collapseBtn.click()
    })

    expect(container.querySelector('aside')?.classList.contains('w-12')).toBe(
      true,
    )
    expect(
      container.querySelector('button[aria-label="Expand sidebar"]'),
    ).not.toBeNull()
  })
})

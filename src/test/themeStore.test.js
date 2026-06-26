import { describe, it, expect, vi } from 'vitest'

// useThemeStore reads localStorage at module init — mock it before importing
const localStorageMock = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() }
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

const { THEMES } = await import('../stores/useThemeStore')

describe('THEMES', () => {

  it('has a dark theme', () => {
    expect(THEMES).toHaveProperty('dark')
  })

  it('dark theme has a vars object', () => {
    expect(THEMES.dark).toHaveProperty('vars')
    expect(typeof THEMES.dark.vars).toBe('object')
  })

  it('dark theme has required CSS vars', () => {
    const required = ['--c-bg', '--c-fg', '--c-accent', '--c-muted']
    required.forEach(v => {
      expect(THEMES.dark.vars, v).toHaveProperty(v)
    })
  })

  it('dark theme has a label', () => {
    expect(THEMES.dark).toHaveProperty('label')
    expect(THEMES.dark.label).toBe('dark')
  })

  it('all theme keys have matching label fields', () => {
    Object.entries(THEMES).forEach(([key, theme]) => {
      expect(theme.label).toBe(key)
    })
  })

  it('each theme var value is a non-empty string', () => {
    Object.entries(THEMES.dark.vars).forEach(([key, val]) => {
      expect(typeof val, key).toBe('string')
      expect(val.length, key).toBeGreaterThan(0)
    })
  })
})

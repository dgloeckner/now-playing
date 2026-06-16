import { describe, it, expect } from 'vitest'
import { loadModeId, nextModeId, saveModeId, DEFAULT_MODE_ID } from './displayMode'

interface Store {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

function memoryStore(initial: Record<string, string> = {}): Store {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
  }
}

describe('loadModeId', () => {
  it('defaults to the default mode when nothing is stored', () => {
    expect(loadModeId(memoryStore())).toBe(DEFAULT_MODE_ID)
  })

  it('falls back to the default when the stored value is not a known mode', () => {
    expect(loadModeId(memoryStore({ np_display_mode: 'bogus' }))).toBe(DEFAULT_MODE_ID)
  })
})

describe('nextModeId', () => {
  it('cycles to the next mode and wraps around', () => {
    expect(nextModeId('minimal')).toBe('party-dj')
    expect(nextModeId('party-dj')).toBe('minimal')
  })
})

describe('saveModeId', () => {
  it('persists the chosen mode so it is restored on load', () => {
    const store = memoryStore()
    saveModeId(store, 'party-dj')
    expect(loadModeId(store)).toBe('party-dj')
  })
})

// Display Mode abstraction (CONTEXT.md): the display renders one mode at a time.
// Pure selection logic; the Svelte layer maps an id to a component.

export const MODE_IDS = ['minimal', 'party-dj'] as const
export type ModeId = (typeof MODE_IDS)[number]

export const DEFAULT_MODE_ID: ModeId = 'minimal'

const STORAGE_KEY = 'np_display_mode'

interface ModeStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function isModeId(value: string | null): value is ModeId {
  return value !== null && (MODE_IDS as readonly string[]).includes(value)
}

/** The persisted Display Mode, or the default if absent/unrecognized. */
export function loadModeId(storage: ModeStore): ModeId {
  const stored = storage.getItem(STORAGE_KEY)
  return isModeId(stored) ? stored : DEFAULT_MODE_ID
}

/** The next mode in the cycle, wrapping from the last back to the first. */
export function nextModeId(current: ModeId): ModeId {
  const index = MODE_IDS.indexOf(current)
  return MODE_IDS[(index + 1) % MODE_IDS.length]
}

/** Persist the chosen Display Mode. */
export function saveModeId(storage: ModeStore, id: ModeId): void {
  storage.setItem(STORAGE_KEY, id)
}

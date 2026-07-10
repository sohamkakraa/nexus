import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFERENCES, explainPreferences, loadPreferences, PREFERENCE_STORAGE_KEY,
  resetPreferences, savePreferences
} from '../../src/renderer/src/preferences'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('local workspace preferences', () => {
  it('persists explicit choices without behavioral data', () => {
    const storage = new MemoryStorage()
    const preferences = {
      ...DEFAULT_PREFERENCES,
      density: 'compact' as const,
      accent: 'tidal' as const,
      emphasis: 'brief' as const,
      motion: 'reduced' as const,
      inspectorDefault: 'closed' as const,
      modelBadges: 'provider' as const,
      suggestedWorkflows: false
    }

    savePreferences(preferences, storage)

    expect(loadPreferences(storage)).toEqual(preferences)
    expect(JSON.parse(storage.getItem(PREFERENCE_STORAGE_KEY) ?? '{}')).not.toHaveProperty('engagement')
    expect(JSON.parse(storage.getItem(PREFERENCE_STORAGE_KEY) ?? '{}')).not.toHaveProperty('analytics')
  })

  it('falls back safely for invalid or future values', () => {
    const storage = new MemoryStorage()
    storage.setItem(PREFERENCE_STORAGE_KEY, '{"version":2,"density":"tiny"}')
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES)
  })

  it('explains and reverses every adaptation', () => {
    const storage = new MemoryStorage()
    savePreferences({ ...DEFAULT_PREFERENCES, emphasis: 'context' }, storage)

    expect(explainPreferences(loadPreferences(storage)).join(' ')).toContain('because you')
    expect(resetPreferences(storage)).toEqual(DEFAULT_PREFERENCES)
    expect(storage.getItem(PREFERENCE_STORAGE_KEY)).toBeNull()
  })
})

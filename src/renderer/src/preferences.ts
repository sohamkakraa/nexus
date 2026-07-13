export type Density = 'compact' | 'comfortable'
export type AccentPalette = 'signal' | 'tidal' | 'orchid' | 'ember'
export type LayoutEmphasis = 'brief' | 'balanced' | 'context'
export type MotionLevel = 'system' | 'reduced' | 'full'
export type InspectorDefault = 'open' | 'closed'

export type WorkspacePreferences = {
  version: 2
  density: Density
  accent: AccentPalette
  emphasis: LayoutEmphasis
  motion: MotionLevel
  inspectorDefault: InspectorDefault
  suggestedWorkflows: boolean
}

export const PREFERENCE_STORAGE_KEY = 'nexus.workspace-preferences.v1'

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  version: 2,
  density: 'comfortable',
  accent: 'signal',
  emphasis: 'balanced',
  motion: 'system',
  inspectorDefault: 'closed',
  suggestedWorkflows: true
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>

const DENSITIES = new Set<Density>(['compact', 'comfortable'])
const ACCENTS = new Set<AccentPalette>(['signal', 'tidal', 'orchid', 'ember'])
const EMPHASES = new Set<LayoutEmphasis>(['brief', 'balanced', 'context'])
const MOTIONS = new Set<MotionLevel>(['system', 'reduced', 'full'])
const INSPECTORS = new Set<InspectorDefault>(['open', 'closed'])

export function loadPreferences(storage: StorageReader = window.localStorage): WorkspacePreferences {
  try {
    const raw = storage.getItem(PREFERENCE_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const value = JSON.parse(raw) as Partial<Omit<WorkspacePreferences, 'version'>> & { version?: number }
    if (
      (value.version !== 1 && value.version !== 2) ||
      !DENSITIES.has(value.density as Density) ||
      !ACCENTS.has(value.accent as AccentPalette) ||
      !EMPHASES.has(value.emphasis as LayoutEmphasis) ||
      !MOTIONS.has(value.motion as MotionLevel) ||
      !INSPECTORS.has(value.inspectorDefault as InspectorDefault) ||
      typeof value.suggestedWorkflows !== 'boolean'
    ) return DEFAULT_PREFERENCES
    return {
      ...(value as Omit<WorkspacePreferences, 'version'>),
      version: 2,
      ...(value.version === 1 ? { inspectorDefault: 'closed' as const } : {})
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: WorkspacePreferences, storage: StorageWriter = window.localStorage): void {
  storage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences))
}

export function resetPreferences(storage: StorageWriter = window.localStorage): WorkspacePreferences {
  storage.removeItem(PREFERENCE_STORAGE_KEY)
  return DEFAULT_PREFERENCES
}

export function explainPreferences(preferences: WorkspacePreferences): string[] {
  return [
    `${preferences.density === 'compact' ? 'Compact' : 'Comfortable'} spacing is active because you selected it.`,
    `${labelForEmphasis(preferences.emphasis)} receives more room because you chose that layout emphasis.`,
    `The ${preferences.accent} accent is applied only on this device.`,
    preferences.suggestedWorkflows
      ? 'Workflow suggestions are visible because you enabled them.'
      : 'Workflow suggestions are hidden because you disabled them.'
  ]
}

function labelForEmphasis(value: LayoutEmphasis): string {
  if (value === 'brief') return 'The working brief'
  if (value === 'context') return 'The context inspector'
  return 'The brief and inspector'
}

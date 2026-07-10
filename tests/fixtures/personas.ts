import type { AppSnapshot, Model } from '../../src/shared/contracts'

export type PersonaId = 'novice' | 'researcher' | 'developer' | 'privacy' | 'accessibility' | 'failing'

export type PersonaScenario = {
  id: PersonaId
  name: string
  goal: string
  snapshot: AppSnapshot
  behavior?: {
    snapshotDelayMs?: number
    snapshotError?: string
    sendError?: string
    offline?: boolean
  }
}

const MODELS: Model[] = [
  {
    id: 'gpt-5.2',
    provider: 'openai',
    label: 'GPT-5.2',
    capabilities: ['text', 'vision', 'image', 'realtime', 'transcription', 'tools', 'research']
  },
  {
    id: 'claude-opus-4-5',
    provider: 'anthropic',
    label: 'Claude Opus 4.5',
    capabilities: ['text', 'vision', 'tools']
  }
]

const EMPTY: AppSnapshot = {
  conversations: [],
  models: [],
  configuredProviders: [],
  jobs: [],
  skills: [],
  platform: {
    os: 'macos',
    architecture: 'arm64',
    credentialStore: 'macOS Keychain',
    systemControls: true,
    systemControlsMessage: 'Apple Events are available with approval for every action.'
  }
}

export const PERSONAS: Record<PersonaId, PersonaScenario> = {
  novice: {
    id: 'novice',
    name: 'Novice BYOK user',
    goal: 'Understand the Council, connect a model, and start from a workflow without sending a paid request.',
    snapshot: EMPTY
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher',
    goal: 'Prepare a bounded research brief, inspect both models, and keep the brief editable.',
    snapshot: {
      ...EMPTY,
      models: MODELS,
      configuredProviders: ['openai', 'anthropic']
    }
  },
  developer: {
    id: 'developer',
    name: 'Developer / power user',
    goal: 'Configure a terminal task, switch to compact density, and use keyboard commands.',
    snapshot: {
      ...EMPTY,
      models: MODELS,
      configuredProviders: ['openai', 'anthropic'],
      jobs: [{ id: 'job-1', kind: 'tool', label: 'Index repository', status: 'running', progress: 42 }]
    }
  },
  privacy: {
    id: 'privacy',
    name: 'Privacy-focused user',
    goal: 'Confirm local history behavior, inspect adaptation reasons, and run only local diagnostics.',
    snapshot: {
      ...EMPTY,
      models: MODELS.slice(0, 1),
      configuredProviders: ['openai']
    }
  },
  accessibility: {
    id: 'accessibility',
    name: 'Accessibility / keyboard user',
    goal: 'Navigate landmarks and workflows by keyboard with reduced motion and visible focus.',
    snapshot: {
      ...EMPTY,
      models: MODELS,
      configuredProviders: ['openai', 'anthropic']
    }
  },
  failing: {
    id: 'failing',
    name: 'Failing-provider / offline user',
    goal: 'Keep local work available while provider actions fail with a specific recovery path.',
    snapshot: {
      ...EMPTY,
      models: MODELS,
      configuredProviders: ['openai', 'anthropic']
    },
    behavior: {
      sendError: 'Provider is unreachable. Check your connection or try the other Council seat.',
      offline: true
    }
  }
}

export const EXECUTABLE_SCENARIOS = Object.values(PERSONAS).map(({ id, name, goal }) => ({ id, name, goal }))

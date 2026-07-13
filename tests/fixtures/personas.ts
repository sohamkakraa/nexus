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
    id: 'gpt-5.6-sol',
    provider: 'openai',
    label: 'GPT-5.6 Sol',
    capabilities: ['text', 'vision', 'image', 'realtime', 'transcription', 'tools', 'research'],
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    reasoningModes: ['standard', 'pro']
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
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
      conversations: [{
        id: 'work-existing',
        title: 'Existing local conversation',
        mode: 'council',
        pinned: false,
        archived: false,
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
        messages: []
      }],
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

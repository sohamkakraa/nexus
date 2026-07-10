import type {
  AppSnapshot, Attachment, ChatRequest, Conversation, JobState, Message, NexusApi,
  PrivacySettings, ProviderId, SkillDefinition
} from '../../src/shared/contracts'
import type { PersonaScenario } from './personas'

export type MockNexus = {
  api: NexusApi
  calls: Array<{ method: keyof NexusApi; args: unknown[] }>
  snapshot(): AppSnapshot
}

export function createMockNexus(scenario: PersonaScenario): MockNexus {
  const current = structuredClone(scenario.snapshot)
  const calls: Array<{ method: keyof NexusApi; args: unknown[] }> = []
  const snapshotListeners = new Set<(snapshot: AppSnapshot) => void>()
  const deltaListeners = new Set<(event: { conversationId: string; delta: string }) => void>()
  let privacy: PrivacySettings = {
    historyRetentionDays: 0,
    personalizationEnabled: false,
    personalizationNotes: '',
    feedbackEnabled: false
  }
  let sequence = 0

  const record = (method: keyof NexusApi, ...args: unknown[]): void => {
    calls.push({ method, args })
  }
  const emit = (): void => {
    const value = structuredClone(current)
    snapshotListeners.forEach((listener) => listener(value))
  }
  const nextId = (prefix: string): string => `${prefix}-${++sequence}`
  const job = (kind: JobState['kind'], label: string, result?: string): JobState => {
    const value: JobState = {
      id: nextId('job'),
      kind,
      label,
      status: 'completed',
      progress: 100,
      ...(result ? { result } : {})
    }
    current.jobs.push(value)
    emit()
    return value
  }

  const api: NexusApi = {
    async getSnapshot() {
      record('getSnapshot')
      if (scenario.behavior?.snapshotDelayMs) await delay(scenario.behavior.snapshotDelayMs)
      if (scenario.behavior?.snapshotError) throw new Error(scenario.behavior.snapshotError)
      return structuredClone(current)
    },
    async saveProviderKey(provider) {
      record('saveProviderKey', provider, '[REDACTED]')
      if (!current.configuredProviders.includes(provider)) current.configuredProviders.push(provider)
      emit()
    },
    async removeProviderKey(provider) {
      record('removeProviderKey', provider)
      current.configuredProviders = current.configuredProviders.filter((item) => item !== provider)
      current.models = current.models.filter((model) => model.provider !== provider)
      emit()
    },
    async discoverModels(provider) {
      record('discoverModels', provider)
      return structuredClone(current.models.filter((model) => model.provider === provider))
    },
    async createConversation(mode) {
      record('createConversation', mode)
      const now = new Date().toISOString()
      const conversation: Conversation = {
        id: nextId('work'),
        title: 'New conversation',
        mode,
        createdAt: now,
        updatedAt: now,
        messages: []
      }
      current.conversations.unshift(conversation)
      emit()
      return structuredClone(conversation)
    },
    async sendMessage(request: ChatRequest) {
      record('sendMessage', request)
      if (scenario.behavior?.sendError) throw new Error(scenario.behavior.sendError)
      const now = new Date().toISOString()
      const conversation = current.conversations.find((item) => item.id === request.conversationId)
      if (!conversation) throw new Error('Mock work item was not found.')
      const userMessage: Message = {
        id: nextId('message'),
        conversationId: request.conversationId,
        role: 'user',
        content: request.content,
        createdAt: now,
        attachments: []
      }
      const response: Message = {
        id: nextId('message'),
        conversationId: request.conversationId,
        role: 'assistant',
        author: request.mode === 'council' ? 'Council synthesis' : 'Lead model',
        content: request.mode === 'council'
          ? 'Mock synthesis: both positions were compared without contacting a provider.'
          : 'Mock direct response: no provider request was made.',
        createdAt: now,
        attachments: []
      }
      deltaListeners.forEach((listener) => listener({ conversationId: request.conversationId, delta: 'Mock synthesis…' }))
      conversation.messages.push(userMessage, response)
      conversation.updatedAt = now
      conversation.title = request.content.split('\n')[0].slice(0, 54) || 'Untitled work item'
      emit()
      return structuredClone(response)
    },
    async selectFiles() {
      record('selectFiles')
      const attachment: Attachment = {
        id: nextId('attachment'),
        name: 'council-brief.pdf',
        path: '/mock/council-brief.pdf',
        mime: 'application/pdf',
        size: 42_000,
        kind: 'pdf'
      }
      return [attachment]
    },
    async generateImage(prompt, model) {
      record('generateImage', prompt, model)
      return job('image', 'Mock image', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>')
    },
    async transcribeFile() {
      record('transcribeFile')
      return job('transcription', 'Mock transcript', 'No external transcription request was made.')
    },
    async createRealtimeSession(model) {
      record('createRealtimeSession', model)
      return { clientSecret: 'mock-client-secret', model }
    },
    async saveRecording(data, mime) {
      record('saveRecording', { bytes: data.byteLength }, mime)
      return job('transcription', 'Mock local recording')
    },
    async startResearch(request) {
      record('startResearch', request)
      return job('research', 'Mock research brief', 'Mock evidence bundle')
    },
    async cancelJob(id) {
      record('cancelJob', id)
      current.jobs = current.jobs.map((item) => item.id === id ? { ...item, status: 'cancelled' } : item)
      emit()
    },
    async runCommand(command, cwd) {
      record('runCommand', command, cwd)
      return { stdout: '/mock/nexus\n', stderr: '', code: 0 }
    },
    async runSystemAction(action, value) {
      record('runSystemAction', action, value)
    },
    async connectMcp(connector) {
      record('connectMcp', connector)
      return [{ name: 'mock.read', description: 'Fixture-only read tool' }]
    },
    async callMcpTool(connectorId, name, args) {
      record('callMcpTool', connectorId, name, args)
      return { mocked: true }
    },
    async generateSkill(description, model) {
      record('generateSkill', description, model)
      const skill: SkillDefinition = {
        id: nextId('skill'),
        name: 'Mock reviewed skill',
        description,
        instructions: 'Fixture only',
        allowedTools: [],
        enabled: false,
        version: 1
      }
      current.skills.push(skill)
      emit()
      return skill
    },
    async getPrivacySettings() {
      record('getPrivacySettings')
      return structuredClone(privacy)
    },
    async updatePrivacySettings(settings) {
      record('updatePrivacySettings', settings)
      privacy = structuredClone(settings)
      return structuredClone(privacy)
    },
    async exportLocalData() {
      record('exportLocalData')
      return null
    },
    async deleteLocalData() {
      record('deleteLocalData')
      current.conversations = []
      current.jobs = []
      emit()
    },
    async previewFeedback(draft) {
      record('previewFeedback', draft)
      return JSON.stringify({ ...draft, diagnostics: draft.includeDiagnostics ? '[REDACTED]' : undefined }, null, 2)
    },
    async exportFeedback(draft) {
      record('exportFeedback', draft)
      return null
    },
    onSnapshot(listener) {
      record('onSnapshot')
      snapshotListeners.add(listener)
      return () => snapshotListeners.delete(listener)
    },
    onChatDelta(listener) {
      record('onChatDelta')
      deltaListeners.add(listener)
      return () => deltaListeners.delete(listener)
    }
  }

  return {
    api,
    calls,
    snapshot: () => structuredClone(current)
  }
}

export function providerName(provider: ProviderId): string {
  return provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

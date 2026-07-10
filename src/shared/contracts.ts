import { z } from 'zod'

export const ProviderSchema = z.enum(['openai', 'anthropic'])
export type ProviderId = z.infer<typeof ProviderSchema>

export const ModelSchema = z.object({
  id: z.string(),
  provider: ProviderSchema,
  label: z.string(),
  capabilities: z.array(z.enum(['text', 'vision', 'image', 'realtime', 'transcription', 'tools', 'research']))
})
export type Model = z.infer<typeof ModelSchema>

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  mime: z.string(),
  size: z.number().nonnegative(),
  kind: z.enum(['text', 'image', 'pdf', 'document', 'audio'])
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  author: z.string().optional(),
  createdAt: z.string(),
  attachments: z.array(AttachmentSchema).default([])
})
export type Message = z.infer<typeof MessageSchema>

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.enum(['solo', 'council']),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(MessageSchema).default([])
})
export type Conversation = z.infer<typeof ConversationSchema>

export const ChatRequestSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(100_000),
  mode: z.enum(['solo', 'council']),
  primaryModel: z.string(),
  secondaryModel: z.string().optional(),
  attachmentIds: z.array(z.string()).max(10).default([])
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>

export const ResearchRequestSchema = z.object({
  conversationId: z.string().min(1).max(200),
  query: z.string().min(3).max(10_000),
  depth: z.enum(['quick', 'deep', 'auto'])
}).strict()

export const PermissionRequestSchema = z.object({
  capability: z.enum(['shell', 'filesystem', 'accessibility', 'connector-write', 'recording']),
  action: z.string(),
  details: z.string(),
  risk: z.enum(['low', 'medium', 'high'])
})
export type PermissionRequest = z.infer<typeof PermissionRequestSchema>

export type JobState = {
  id: string
  kind: 'research' | 'transcription' | 'image' | 'tool'
  label: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  result?: string
  error?: string
}

export type ConnectorInput =
  | { id: string; name: string; transport: 'http'; url: string; token?: string }
  | { id: string; name: string; transport: 'stdio'; command: 'npx' | 'node' | 'uvx' | 'python3'; args: string[] }

export type SkillDefinition = {
  id: string
  name: string
  description: string
  instructions: string
  allowedTools: string[]
  enabled: boolean
  version: number
}

export const PrivacySettingsSchema = z.object({
  historyRetentionDays: z.union([z.literal(0), z.literal(30), z.literal(90), z.literal(365)]).default(0),
  personalizationEnabled: z.boolean().default(false),
  personalizationNotes: z.string().max(10_000).default(''),
  feedbackEnabled: z.boolean().default(false)
}).strict()
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>

export const FeedbackDraftSchema = z.object({
  category: z.enum(['bug', 'idea', 'usability', 'other']),
  summary: z.string().trim().min(10).max(4_000),
  includeDiagnostics: z.boolean().default(false)
}).strict()
export type FeedbackDraft = z.infer<typeof FeedbackDraftSchema>

export type PlatformCapabilities = {
  os: 'macos' | 'windows' | 'linux'
  architecture: 'arm64' | 'x64' | 'other'
  credentialStore: string
  systemControls: boolean
  systemControlsMessage: string
}

export type AppSnapshot = {
  conversations: Conversation[]
  models: Model[]
  configuredProviders: ProviderId[]
  jobs: JobState[]
  skills: SkillDefinition[]
  platform: PlatformCapabilities
}

export type NexusApi = {
  getSnapshot(): Promise<AppSnapshot>
  saveProviderKey(provider: ProviderId, key: string): Promise<void>
  removeProviderKey(provider: ProviderId): Promise<void>
  discoverModels(provider: ProviderId): Promise<Model[]>
  createConversation(mode: 'solo' | 'council'): Promise<Conversation>
  sendMessage(request: ChatRequest): Promise<Message>
  selectFiles(): Promise<Attachment[]>
  generateImage(prompt: string, model: string): Promise<JobState>
  transcribeFile(): Promise<JobState | null>
  createRealtimeSession(model: string): Promise<{ clientSecret: string; model: string }>
  saveRecording(data: Uint8Array, mime: string): Promise<JobState>
  startResearch(request: z.input<typeof ResearchRequestSchema>): Promise<JobState>
  cancelJob(id: string): Promise<void>
  runCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; code: number }>
  runSystemAction(action: 'open-app' | 'set-volume' | 'toggle-dark-mode', value?: string): Promise<void>
  connectMcp(connector: ConnectorInput): Promise<Array<{ name: string; description?: string }>>
  callMcpTool(connectorId: string, name: string, args: Record<string, unknown>): Promise<unknown>
  generateSkill(description: string, model: string): Promise<SkillDefinition>
  getPrivacySettings(): Promise<PrivacySettings>
  updatePrivacySettings(settings: PrivacySettings): Promise<PrivacySettings>
  exportLocalData(): Promise<string | null>
  deleteLocalData(): Promise<void>
  previewFeedback(draft: FeedbackDraft): Promise<string>
  exportFeedback(draft: FeedbackDraft): Promise<string | null>
  onSnapshot(listener: (snapshot: AppSnapshot) => void): () => void
  onChatDelta(listener: (event: { conversationId: string; delta: string }) => void): () => void
}

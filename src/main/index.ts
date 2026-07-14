import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  type IpcMainInvokeEvent,
  type WebContents
} from 'electron'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import {
  ChatRequestSchema, ProviderSchema, ResearchRequestSchema,
  type AppSnapshot, type Conversation, type Model, type ProviderId, type ReasoningEffort
} from '../shared/contracts'
import { ProviderConnectionError } from '../shared/provider-errors'
import { defaultModelForCapability } from '../shared/models'
import {
  isSafeDevelopmentUrl,
  isTrustedRendererUrl,
  redactForPreview,
  redactSecrets
} from '../shared/safety'
import {
  deleteConversation as deleteConversationRecord,
  getAttachments,
  insertConversation,
  listConversations,
  openDatabase,
  setConversationArchived,
  setConversationPinned,
  setConversationWorkspace
} from './database'
import { diagnostic } from './diagnostics'
import { selectAndImportFiles } from './files'
import {
  cancelJob, configureJobNotifications, listJobs, startImageJob,
  startResearchJob, startTranscriptionJob
} from './jobs'
import { callMcpTool, ConnectorSchema, connectMcp, disconnectAllMcp } from './mcp'
import { runChat } from './orchestrator'
import { runApprovedCommand, runApprovedSystemAction } from './permissions'
import { platformCapabilities } from './platform'
import {
  applyHistoryRetention,
  deleteLocalData,
  exportFeedback,
  exportLocalData,
  getPrivacySettings,
  previewFeedback,
  updatePrivacySettings
} from './privacy'
import { createRealtimeSession, discoverProviderModels, generate } from './providers'
import { configuredProviders, providerCredentials, removeProviderKey, setProviderKey } from './secrets'
import { generateSkill, listSkills } from './skills'
import { selectWorkspaceDirectory } from './workspace'

let mainWindow: BrowserWindow | null = null
const models = new Map<string, Model>()
const configuredProviderIds = new Set<ProviderId>()
const rendererFile = join(__dirname, '../renderer/index.html')
const developmentRendererUrl = !app.isPackaged
  && process.env.ELECTRON_RENDERER_URL
  && isSafeDevelopmentUrl(process.env.ELECTRON_RENDERER_URL)
  ? process.env.ELECTRON_RENDERER_URL
  : undefined
const restoreConfiguredProviders = !(
  process.env.NEXUS_USER_DATA_DIR
  && process.env.NEXUS_DISABLE_PROVIDER_RESTORE === '1'
)
if (process.env.NEXUS_USER_DATA_DIR && process.env.NEXUS_DISABLE_PROVIDER_RESTORE === '1') {
  app.setPath('userData', process.env.NEXUS_USER_DATA_DIR)
}

async function snapshot(): Promise<AppSnapshot> {
  return {
    conversations: listConversations(),
    models: [...models.values()],
    configuredProviders: [...configuredProviderIds],
    jobs: listJobs(),
    skills: await listSkills(),
    platform: platformCapabilities()
  }
}

async function broadcastSnapshot(): Promise<void> {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('snapshot:changed', await snapshot())
}

function registerIpc(): void {
  handleTrusted('snapshot:get', snapshot)
  handleTrusted('provider:save', async (_event, rawProvider: unknown, key: unknown) => {
    const provider = ProviderSchema.parse(rawProvider)
    if (typeof key !== 'string') throw new Error('API key is required.')
    try {
      const discovered = await setProviderKey(
        provider,
        key,
        (candidate) => discoverProviderModels(provider, candidate)
      )
      configuredProviderIds.add(provider)
      replaceProviderModels(provider, discovered)
      await broadcastSnapshot()
    } catch (error) {
      await refreshConfiguredProviderIds()
      await broadcastSnapshot()
      throw error
    }
  })
  handleTrusted('provider:remove', async (_event, rawProvider: unknown) => {
    const provider = ProviderSchema.parse(rawProvider)
    await removeProviderKey(provider)
    configuredProviderIds.delete(provider)
    for (const [id, model] of models) if (model.provider === provider) models.delete(id)
    await broadcastSnapshot()
  })
  handleTrusted('models:discover', async (_event, rawProvider: unknown) => {
    const provider = ProviderSchema.parse(rawProvider)
    try {
      const discovered = await discoverProviderModels(provider)
      replaceProviderModels(provider, discovered)
      await broadcastSnapshot()
      return discovered
    } catch (error) {
      if (error instanceof ProviderConnectionError && error.code === 'authentication') {
        replaceProviderModels(provider, [])
        await broadcastSnapshot()
      }
      throw error
    }
  })
  handleTrusted('models:test-response', async (_event, modelId: unknown) => {
    if (typeof modelId !== 'string') throw new Error('Choose a model to test.')
    const model = requireModelCapability(modelId, 'text')
    const response = await generate(model.provider, {
      model: model.id,
      system: 'This is an explicit connection test. Reply with exactly: Nexus connection ready.',
      prompt: 'Confirm the connection.'
    })
    return response.slice(0, 500)
  })
  handleTrusted('conversation:create', async (_event, rawMode: unknown) => {
    const mode = rawMode === 'council' ? 'council' : 'solo'
    const now = new Date().toISOString()
    const conversation: Conversation = {
      id: nanoid(), title: 'New conversation', mode, pinned: false, archived: false,
      createdAt: now, updatedAt: now, messages: []
    }
    insertConversation(conversation)
    void broadcastSnapshot().catch(() => diagnostic('snapshot-broadcast-failed', { source: 'conversation-create' }))
    return conversation
  })
  handleTrusted('conversation:pin', async (_event, id: unknown, pinned: unknown) => {
    setConversationPinned(conversationId(id), pinned === true)
    await broadcastSnapshot()
  })
  handleTrusted('conversation:archive', async (_event, id: unknown, archived: unknown) => {
    setConversationArchived(conversationId(id), archived === true)
    await broadcastSnapshot()
  })
  handleTrusted('conversation:delete', async (_event, id: unknown) => {
    const paths = deleteConversationRecord(conversationId(id))
    await Promise.all(paths.map((path) => rm(path, { force: true }).catch(() => undefined)))
    await broadcastSnapshot()
  })
  handleTrusted('conversation:workspace:select', async (_event, id: unknown) => {
    const workspace = await selectWorkspaceDirectory()
    if (!workspace) return null
    setConversationWorkspace(conversationId(id), workspace)
    await broadcastSnapshot()
    return workspace
  })
  handleTrusted('conversation:workspace:clear', async (_event, id: unknown) => {
    setConversationWorkspace(conversationId(id), null)
    await broadcastSnapshot()
  })
  handleTrusted('chat:send', async (event, rawRequest: unknown) => {
    const request = ChatRequestSchema.parse(rawRequest)
    const primary = requireModelCapability(request.primaryModel, 'text')
    requireReasoningSupport(primary, request.primaryReasoningEffort)
    if (request.mode === 'council') {
      const secondary = requireModelCapability(request.secondaryModel!, 'text')
      requireReasoningSupport(secondary, request.secondaryReasoningEffort)
      if (
        request.reasoningMode
        && !primary.reasoningModes?.includes(request.reasoningMode)
        && !secondary.reasoningModes?.includes(request.reasoningMode)
      ) throw new Error('The selected models do not support that reasoning mode.')
    } else if (request.reasoningMode && !primary.reasoningModes?.includes(request.reasoningMode)) {
      throw new Error('The selected model does not support that reasoning mode.')
    }
    try {
      const message = await runChat(request, getAttachments(request.attachmentIds), undefined, (delta) => {
        event.sender.send('chat:delta', { conversationId: request.conversationId, delta })
      })
      await broadcastSnapshot()
      return message
    } catch (error) {
      if (error instanceof ProviderConnectionError && error.code === 'authentication') {
        replaceProviderModels(error.provider, [])
        await broadcastSnapshot()
      }
      throw error
    }
  })
  handleTrusted('files:select', async () => selectAndImportFiles())
  handleTrusted('image:generate', async (_event, prompt: unknown, model: unknown) => {
    if (typeof prompt !== 'string' || typeof model !== 'string') throw new Error('Prompt and image model are required.')
    requireModelCapability(model, 'image')
    return startImageJob(prompt.slice(0, 10_000), model)
  })
  handleTrusted('audio:transcribe', async () => {
    const [attachment] = (await selectAndImportFiles()).filter((file) => file.kind === 'audio')
    return attachment ? startTranscriptionJob(attachment.path, transcriptionModel()) : null
  })
  handleTrusted('realtime:create', (_event, model: unknown, reasoningEffort: unknown) => {
    if (typeof model !== 'string' || !model) throw new Error('Choose a realtime model first.')
    const selected = requireModelCapability(model, 'realtime')
    const effort = typeof reasoningEffort === 'string' && selected.reasoningEfforts?.includes(reasoningEffort as never)
      ? reasoningEffort as ReasoningEffort
      : undefined
    return createRealtimeSession(model, effort)
  })
  handleTrusted('recording:save', async (_event, rawData: unknown, mime: unknown) => {
    if (!(rawData instanceof Uint8Array) || rawData.byteLength > 200 * 1024 * 1024) throw new Error('Recording data is invalid or too large.')
    const directory = join(app.getPath('userData'), 'recordings')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const extension = typeof mime === 'string' && mime.includes('mp4') ? 'm4a' : 'webm'
    const path = join(directory, `${Date.now()}-${nanoid(6)}.${extension}`)
    await writeFile(path, rawData, { mode: 0o600 })
    return startTranscriptionJob(path, transcriptionModel())
  })
  handleTrusted('research:start', async (_event, rawRequest: unknown) => {
    const request = ResearchRequestSchema.parse(rawRequest)
    return startResearchJob(request.query, request.depth, capabilityModel('research'))
  })
  handleTrusted('job:cancel', (_event, id: unknown) => {
    if (typeof id === 'string') cancelJob(id)
  })
  handleTrusted('command:run', (_event, command: unknown, cwd: unknown) => {
    if (typeof command !== 'string') throw new Error('Command is required.')
    return runApprovedCommand(command, typeof cwd === 'string' ? cwd : undefined)
  })
  handleTrusted('system:run', (_event, action: unknown, value: unknown) => {
    if (!['open-app', 'set-volume', 'toggle-dark-mode'].includes(String(action))) throw new Error('Unknown system action.')
    return runApprovedSystemAction(action as 'open-app' | 'set-volume' | 'toggle-dark-mode', typeof value === 'string' ? value : undefined)
  })
  handleTrusted('mcp:connect', async (_event, rawConnector: unknown) => {
    const connector = ConnectorSchema.parse(rawConnector)
    const detail = connector.transport === 'http'
      ? `Remote HTTPS server: ${redactSecrets(connector.url)}\nCredentials are held in memory for this session only.`
      : `Local process: ${redactSecrets(`${connector.command} ${connector.args.join(' ')}`)}\nOnly a minimal environment without provider credentials will be shared.`
    const approval = await dialog.showMessageBox({
      type: 'warning', buttons: ['Cancel', 'Connect once'], defaultId: 0, cancelId: 0,
      title: 'Connect to MCP server?', message: connector.name, detail, noLink: true
    })
    if (approval.response !== 1) throw new Error('Connector connection cancelled.')
    return connectMcp(connector)
  })
  handleTrusted('mcp:call', async (_event, connectorId: unknown, name: unknown, args: unknown) => {
    if (
      typeof connectorId !== 'string'
      || !/^[a-zA-Z0-9_-]{1,80}$/.test(connectorId)
      || typeof name !== 'string'
      || !/^[a-zA-Z0-9_.:/-]{1,200}$/.test(name)
      || !args
      || typeof args !== 'object'
      || Array.isArray(args)
    ) throw new Error('Invalid MCP tool request.')
    const preview = JSON.stringify(redactForPreview(args))
    if (preview.length > 100_000) throw new Error('MCP tool arguments exceed the safety limit.')
    const approval = await dialog.showMessageBox({
      type: 'warning', buttons: ['Cancel', 'Allow once'], defaultId: 0, cancelId: 0,
      title: 'Allow connector tool?', message: name,
      detail: `Connector: ${connectorId}\nArguments: ${preview.slice(0, 1200)}`, noLink: true
    })
    if (approval.response !== 1) throw new Error('Connector action cancelled.')
    return callMcpTool(connectorId, name, args as Record<string, unknown>)
  })
  handleTrusted('skill:generate', async (_event, description: unknown, model: unknown) => {
    if (typeof description !== 'string' || typeof model !== 'string') throw new Error('Description and model are required.')
    requireModelCapability(model, 'text')
    const skill = await generateSkill(description, model)
    await broadcastSnapshot()
    return skill
  })
  handleTrusted('privacy:get', getPrivacySettings)
  handleTrusted('privacy:update', async (_event, settings: unknown) => {
    const updated = await updatePrivacySettings(settings)
    await broadcastSnapshot()
    return updated
  })
  handleTrusted('privacy:export', exportLocalData)
  handleTrusted('privacy:delete', async () => {
    if (await deleteLocalData()) await broadcastSnapshot()
  })
  handleTrusted('feedback:preview', async (_event, draft: unknown) => previewFeedback(draft))
  handleTrusted('feedback:export', async (_event, draft: unknown) => exportFeedback(draft))
}

function transcriptionModel(): string {
  return capabilityModel('transcription')
}

function capabilityModel(capability: 'research' | 'transcription'): string {
  const available = defaultModelForCapability([...models.values()], capability, 'openai')
  if (!available) {
    throw new Error(`OpenAI has no account-available ${capability} model. Refresh OpenAI in Connections or check account access.`)
  }
  return available.id
}

function replaceProviderModels(provider: ProviderId, discovered: Model[]): void {
  for (const [id, model] of models) if (model.provider === provider) models.delete(id)
  discovered.forEach((model) => models.set(model.id, model))
}

function requireModelCapability(modelId: string, capability: Model['capabilities'][number]): Model {
  const model = models.get(modelId)
  if (!model || !model.capabilities.includes(capability)) {
    throw new Error(`Choose an account-available ${capability} model in Connections.`)
  }
  return model
}

function requireReasoningSupport(model: Model, effort?: ReasoningEffort): void {
  if (effort && !model.reasoningEfforts?.includes(effort)) {
    throw new Error(`${model.label} does not support the selected thinking level.`)
  }
}

function conversationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{6,80}$/.test(value)) {
    throw new Error('Conversation identifier is invalid.')
  }
  return value
}

async function refreshConfiguredProviderIds(): Promise<void> {
  const configured = await configuredProviders()
  configuredProviderIds.clear()
  configured.forEach((provider) => configuredProviderIds.add(provider))
}

async function restoreProviderModels(): Promise<void> {
  const credentials = await providerCredentials()
  configuredProviderIds.clear()
  const providers = Object.keys(credentials) as ProviderId[]
  providers.forEach((provider) => configuredProviderIds.add(provider))
  for (const provider of providers) {
    try {
      replaceProviderModels(provider, await discoverProviderModels(provider, credentials[provider]))
    } catch (error) {
      if (error instanceof ProviderConnectionError && error.code === 'authentication') {
        replaceProviderModels(provider, [])
        await diagnostic('provider-authentication-failed', { provider })
      } else {
        await diagnostic('provider-model-discovery-failed', { provider })
      }
    }
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 18 } }
      : { autoHideMenuBar: true }),
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault())
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    void diagnostic('renderer-gone', { reason: details.reason, exitCode: details.exitCode })
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  if (developmentRendererUrl) await mainWindow.loadURL(developmentRendererUrl)
  else await mainWindow.loadFile(rendererFile)
}

app.whenReady().then(async () => {
  openDatabase()
  await applyHistoryRetention()
  registerIpc()
  configureJobNotifications(() => void broadcastSnapshot())
  configureSessionSecurity()
  await createWindow()
  if (restoreConfiguredProviders) {
    void restoreProviderModels()
      .then(() => broadcastSnapshot())
      .catch(() => diagnostic('provider-model-restore-failed'))
  }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow() })
})

app.on('before-quit', () => { void disconnectAllMcp() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
process.on('uncaughtException', (error) => { void diagnostic('uncaught-exception', { name: error.name, message: error.message }) })
process.on('unhandledRejection', (reason) => { void diagnostic('unhandled-rejection', { message: reason instanceof Error ? reason.message : String(reason) }) })

function handleTrusted<Arguments extends unknown[], Result>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: Arguments) => Result
): void {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event)
    return listener(event, ...(args as Arguments))
  })
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (
    !mainWindow
    || event.sender !== mainWindow.webContents
    || event.senderFrame !== mainWindow.webContents.mainFrame
    || !isTrustedRendererUrl(event.senderFrame.url, rendererFile, developmentRendererUrl)
  ) throw new Error('Blocked IPC request from an untrusted renderer.')
}

function configureSessionSecurity(): void {
  const trustedContents = (contents: WebContents | null): boolean => Boolean(
    contents
    && mainWindow
    && contents === mainWindow.webContents
    && isTrustedRendererUrl(contents.getURL(), rendererFile, developmentRendererUrl)
  )
  session.defaultSession.setPermissionCheckHandler((contents, permission, requestingOrigin) => {
    return permission === 'media'
      && trustedContents(contents)
      && (
        requestingOrigin === 'file://'
        || isTrustedRendererUrl(requestingOrigin, rendererFile, developmentRendererUrl)
      )
  })
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const mediaTypes = 'mediaTypes' in details && Array.isArray(details.mediaTypes) ? details.mediaTypes : []
    callback(
      permission === 'media'
      && trustedContents(contents)
      && mediaTypes.length > 0
      && mediaTypes.every((type) => type === 'audio')
    )
  })
  session.defaultSession.setDevicePermissionHandler(() => false)
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => callback({}))
  const connectSource = developmentRendererUrl ? " 'self' ws://localhost:* ws://127.0.0.1:* https://api.openai.com" : " 'self' https://api.openai.com"
  const policy = [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src${connectSource}`
  ].join('; ')
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [policy]
    }
  }))
}

import { app, dialog } from 'electron'
import { copyFile, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import {
  FeedbackDraftSchema,
  PrivacySettingsSchema,
  type FeedbackDraft,
  type PrivacySettings
} from '../shared/contracts'
import { redactSecrets } from '../shared/safety'
import {
  clearLocalDatabase,
  listAttachments,
  listConversations,
  pruneHistoryBefore
} from './database'
import { listSkills } from './skills'

const DEFAULT_SETTINGS: PrivacySettings = PrivacySettingsSchema.parse({})

export async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    return PrivacySettingsSchema.parse(JSON.parse(await readFile(settingsPath(), 'utf8')))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function updatePrivacySettings(input: unknown): Promise<PrivacySettings> {
  const settings = PrivacySettingsSchema.parse(input)
  const directory = join(app.getPath('userData'), 'preferences')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), { mode: 0o600 })
  await applyHistoryRetention(settings)
  return settings
}

export async function applyHistoryRetention(input?: PrivacySettings): Promise<void> {
  const settings = input ?? await getPrivacySettings()
  if (settings.historyRetentionDays === 0) return
  const cutoff = new Date(Date.now() - settings.historyRetentionDays * 86_400_000).toISOString()
  await Promise.all(pruneHistoryBefore(cutoff).map((path) => unlink(path).catch(() => undefined)))
}

export async function exportLocalData(): Promise<string | null> {
  const selection = await dialog.showOpenDialog({
    title: 'Export Nexus data',
    buttonLabel: 'Export here',
    properties: ['openDirectory', 'createDirectory']
  })
  if (selection.canceled || !selection.filePaths[0]) return null
  const exportDirectory = join(selection.filePaths[0], `Nexus Export ${timestamp()}`)
  const filesDirectory = join(exportDirectory, 'files')
  await mkdir(filesDirectory, { recursive: true, mode: 0o700 })
  const attachments = listAttachments()
  const exportedFiles = await Promise.all(attachments.map(async (attachment) => {
    const exportedName = `${attachment.id}${safeExtension(attachment.path)}`
    try {
      await copyFile(attachment.path, join(filesDirectory, exportedName))
      return { ...withoutPath(attachment), exportedFile: `files/${exportedName}` }
    } catch {
      return { ...withoutPath(attachment), exportedFile: null, unavailable: true }
    }
  }))
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    privacy: await getPrivacySettings(),
    conversations: listConversations().map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({
        ...message,
        attachments: message.attachments.map(withoutPath)
      }))
    })),
    attachments: exportedFiles,
    skills: await listSkills(),
    excluded: ['macOS Keychain credentials', 'provider API keys', 'temporary job state']
  }
  await writeFile(join(exportDirectory, 'nexus-data.json'), JSON.stringify(payload, null, 2), { mode: 0o600 })
  return exportDirectory
}

export async function deleteLocalData(): Promise<boolean> {
  const confirmation = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Delete local data'],
    defaultId: 0,
    cancelId: 0,
    title: 'Delete local Nexus data?',
    message: 'Delete conversations, imported files, recordings, personalization, skills, and diagnostics?',
    detail: 'This cannot be undone. Provider API keys remain in macOS Keychain and can be removed separately in Connections.',
    noLink: true
  })
  if (confirmation.response !== 1) return false
  const paths = clearLocalDatabase()
  await Promise.all(paths.map((path) => unlink(path).catch(() => undefined)))
  await Promise.all(['uploads', 'recordings', 'diagnostics', 'skills', 'preferences'].map((name) =>
    rm(join(app.getPath('userData'), name), { recursive: true, force: true })
  ))
  return true
}

export async function previewFeedback(input: unknown): Promise<string> {
  const settings = await getPrivacySettings()
  if (!settings.feedbackEnabled) throw new Error('Enable feedback sharing before creating a feedback package.')
  const draft = FeedbackDraftSchema.parse(input)
  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    category: draft.category,
    summary: redactSecrets(draft.summary),
    appVersion: app.getVersion(),
    platform: `${process.platform}/${process.arch}`,
    excludedByDefault: ['conversation text', 'prompts', 'model responses', 'file names', 'file contents', 'API keys']
  }
  if (draft.includeDiagnostics) payload.diagnosticExcerpt = await diagnosticExcerpt()
  return JSON.stringify(payload, null, 2)
}

export async function exportFeedback(input: unknown): Promise<string | null> {
  const draft: FeedbackDraft = FeedbackDraftSchema.parse(input)
  const preview = await previewFeedback(draft)
  const selection = await dialog.showSaveDialog({
    title: 'Export reviewed feedback',
    defaultPath: `Nexus Feedback ${timestamp()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (selection.canceled || !selection.filePath) return null
  await writeFile(selection.filePath, preview, { mode: 0o600 })
  return selection.filePath
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'preferences', 'privacy.json')
}

async function diagnosticExcerpt(): Promise<string[]> {
  try {
    const content = redactSecrets(await readFile(join(app.getPath('userData'), 'diagnostics', 'nexus.log'), 'utf8'))
    return content.split('\n').filter(Boolean).slice(-25).map((line) => line.slice(0, 1_500))
  } catch {
    return []
  }
}

function withoutPath<T extends { path: string }>(value: T): Omit<T, 'path'> {
  const { path: _path, ...safe } = value
  return safe
}

function safeExtension(path: string): string {
  const extension = extname(path).toLowerCase()
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

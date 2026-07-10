import { app, dialog } from 'electron'
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileTypeFromFile } from 'file-type'
import mammoth from 'mammoth'
import { nanoid } from 'nanoid'
import type { Attachment } from '../shared/contracts'
import { saveAttachment } from './database'

const MAX_FILES = 10
const MAX_FILE_BYTES = 40 * 1024 * 1024
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.js', '.ts', '.tsx', '.jsx', '.py', '.rs', '.go', '.java', '.swift', '.html', '.css'])
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp'
])

export async function selectAndImportFiles(): Promise<Attachment[]> {
  const selected = await dialog.showOpenDialog({
    title: 'Add context',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Supported files', extensions: ['txt', 'md', 'csv', 'json', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'mp4', 'm4a', 'wav', 'js', 'ts', 'tsx', 'py', 'rs', 'go', 'java', 'swift', 'html', 'css'] }]
  })
  if (selected.canceled) return []
  if (selected.filePaths.length > MAX_FILES) throw new Error(`Add no more than ${MAX_FILES} files at once.`)

  const destination = join(app.getPath('userData'), 'uploads')
  await mkdir(destination, { recursive: true, mode: 0o700 })
  const attachments: Attachment[] = []
  for (const source of selected.filePaths) {
    const info = await stat(source)
    if (!info.isFile() || info.size > MAX_FILE_BYTES) throw new Error(`${basename(source)} exceeds the 40 MB limit.`)
    const extension = extname(source).toLowerCase()
    const detected = await fileTypeFromFile(source)
    const mime = detected?.mime ?? (TEXT_EXTENSIONS.has(extension) ? 'text/plain' : 'application/octet-stream')
    if (!ALLOWED_MIMES.has(mime) && !mime.startsWith('text/')) throw new Error(`${basename(source)} is not a supported safe file type.`)
    const id = nanoid()
    const target = join(destination, `${id}${extension}`)
    await copyFile(source, target)
    const attachment: Attachment = { id, name: basename(source), path: target, mime, size: info.size, kind: kindFor(mime, extension) }
    saveAttachment(attachment)
    attachments.push(attachment)
  }
  return attachments
}

export async function attachmentPayload(attachment: Attachment): Promise<{ base64: string; text?: string }> {
  const buffer = await readFile(attachment.path)
  let text = attachment.kind === 'text' ? buffer.toString('utf8').slice(0, 200_000) : undefined
  if (attachment.kind === 'document') text = (await mammoth.extractRawText({ buffer })).value.slice(0, 200_000)
  return { base64: buffer.toString('base64'), text }
}

function kindFor(mime: string, extension: string): Attachment['kind'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf') return 'pdf'
  if (extension === '.docx') return 'document'
  return 'text'
}

import { app } from 'electron'
import { appendFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { redactSecrets } from '../shared/safety'

export async function diagnostic(event: string, details: Record<string, unknown> = {}): Promise<void> {
  try {
    const directory = join(app.getPath('userData'), 'diagnostics')
    const path = join(directory, 'nexus.log')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    try {
      if ((await stat(path)).size > 2 * 1024 * 1024) await writeFile(path, '', { mode: 0o600 })
    } catch { /* first log entry */ }
    const safeDetails = JSON.stringify(details, (_key, value) => {
      if (typeof value !== 'string') return value
      return redactSecrets(value).slice(0, 1000)
    })
    await appendFile(path, `${new Date().toISOString()} ${event} ${safeDetails}\n`, { mode: 0o600 })
  } catch {
    // Diagnostics must never interrupt the application.
  }
}

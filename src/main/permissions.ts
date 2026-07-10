import { dialog } from 'electron'
import { execFile } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  isPathInside,
  parseApprovedCommand,
  redactSecrets,
  restrictedChildEnvironment
} from '../shared/safety'

const execute = promisify(execFile)

export async function runApprovedCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const parsed = parseApprovedCommand(command)
  const [homeDirectory, workingDirectory] = await Promise.all([
    realpath(homedir()),
    realpath(resolve(cwd || homedir()))
  ])
  if (!isPathInside(homeDirectory, workingDirectory)) throw new Error('Commands are limited to your home directory.')
  if (!(await stat(workingDirectory)).isDirectory()) throw new Error('The command working directory is not a directory.')

  const approval = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Run once'],
    defaultId: 0,
    cancelId: 0,
    title: 'Allow command?',
    message: parsed.binary,
    detail: `${parsed.args.join(' ')}\n\nWorking directory: ${workingDirectory}`,
    noLink: true
  })
  if (approval.response !== 1) throw new Error('Command cancelled.')

  try {
    const result = await execute(parsed.binary, executionArguments(parsed), {
      cwd: workingDirectory,
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      env: restrictedChildEnvironment(process.env),
      windowsHide: true
    })
    return { stdout: redactSecrets(result.stdout), stderr: redactSecrets(result.stderr), code: 0 }
  } catch (error) {
    const value = error as Error & { stdout?: string; stderr?: string; code?: number }
    return { stdout: redactSecrets(value.stdout ?? ''), stderr: redactSecrets(value.stderr ?? value.message), code: value.code ?? 1 }
  }
}

export async function runApprovedSystemAction(
  action: 'open-app' | 'set-volume' | 'toggle-dark-mode',
  value?: string
): Promise<void> {
  let script: string
  let detail: string
  if (action === 'open-app') {
    if (!value || !/^[\p{L}\p{N} ._-]{1,80}$/u.test(value)) throw new Error('Enter a valid application name.')
    script = `tell application ${JSON.stringify(value)} to activate`
    detail = `Open ${value}`
  } else if (action === 'set-volume') {
    const volume = Number(value)
    if (!Number.isInteger(volume) || volume < 0 || volume > 100) throw new Error('Volume must be a whole number from 0 to 100.')
    script = `set volume output volume ${volume}`
    detail = `Set output volume to ${volume}%`
  } else {
    script = 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'
    detail = 'Toggle the macOS appearance'
  }
  const approval = await dialog.showMessageBox({
    type: 'warning', buttons: ['Cancel', 'Allow once'], defaultId: 0, cancelId: 0,
    title: 'Allow system control?', message: detail,
    detail: 'Nexus will ask macOS to perform this action.', noLink: true
  })
  if (approval.response !== 1) throw new Error('System action cancelled.')
  await execute('/usr/bin/osascript', ['-e', script], { timeout: 15_000 })
}

function executionArguments(parsed: { binary: string; args: string[] }): string[] {
  if (parsed.binary !== 'git') return parsed.args
  const [subcommand, ...args] = parsed.args
  if (!subcommand) throw new Error('A read-only git subcommand is required.')
  const inspectionFlags = ['diff', 'show'].includes(subcommand) ? ['--no-ext-diff', '--no-textconv'] : []
  return ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', subcommand, ...inspectionFlags, ...args]
}


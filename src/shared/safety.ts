import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAFE_BINARIES = new Set(['pwd', 'ls', 'git', 'rg'])
const SAFE_GIT_SUBCOMMANDS = new Set(['status', 'diff', 'log', 'show', 'rev-parse'])
const BLOCKED_ARGS = /(^|\s)(--force|-f|-rf|-fr|--exec|--ext-diff|--no-index|--output|--pre|--hostname-bin|-C|--git-dir|--work-tree|sudo|chmod|chown)(\s|=|$)/i
const SHELL_SYNTAX = /[;&|`$<>\n\r]/
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export function parseApprovedCommand(command: string): { binary: string; args: string[] } {
  const trimmed = command.trim()
  if (trimmed.length > 16_000) throw new Error('Command is too long.')
  if (!trimmed || SHELL_SYNTAX.test(trimmed)) throw new Error('Pipes, redirects, substitutions, and chained commands are not allowed.')
  const tokens = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((token) => token.replace(/^(['"])(.*)\1$/, '$2')) ?? []
  if (!tokens.length) throw new Error('Enter a command.')
  if (!SAFE_BINARIES.has(tokens[0])) throw new Error(`${tokens[0]} is not in the approved command set.`)
  if (BLOCKED_ARGS.test(trimmed)) throw new Error('Nexus blocked a destructive or privileged command.')
  if (tokens.length > 64 || tokens.some((token) => token.length > 4_096)) throw new Error('Command arguments exceed the safety limit.')
  if (tokens.slice(1).some(isOutsidePathArgument)) throw new Error('Command paths must stay within the approved working directory.')
  if (tokens[0] === 'git' && (!tokens[1] || !SAFE_GIT_SUBCOMMANDS.has(tokens[1]))) {
    throw new Error('Only read-only git status, diff, log, show, and rev-parse commands are allowed.')
  }
  return { binary: tokens[0], args: tokens.slice(1) }
}

export function redactSecrets(value: string): string {
  return value
    .replace(/\b(sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]{16,}={0,2}\b/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(["']?(?:api[_-]?key|token|authorization|password|secret)["']?\s*[:=]\s*["']?)[^\s"',}]{8,}/gi, '$1[REDACTED]')
    .slice(0, 2 * 1024 * 1024)
}

export function redactForPreview(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value)
  if (Array.isArray(value)) return value.slice(0, 100).map(redactForPreview)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, entry]) => [
      key,
      /key|token|authorization|password|secret/i.test(key) ? '[REDACTED]' : redactForPreview(entry)
    ]))
  }
  return value
}

export function isPathInside(parent: string, candidate: string): boolean {
  const delta = relative(resolve(parent), resolve(candidate))
  return delta === '' || (!delta.startsWith(`..${sep}`) && delta !== '..' && !isAbsolute(delta))
}

export function isSafeDevelopmentUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export function isTrustedRendererUrl(
  rawUrl: string,
  rendererFile: string,
  developmentUrl?: string
): boolean {
  try {
    const candidate = new URL(rawUrl)
    candidate.hash = ''
    candidate.search = ''
    if (candidate.protocol === 'file:') return fileURLToPath(candidate) === resolve(rendererFile)
    if (!developmentUrl || !isSafeDevelopmentUrl(developmentUrl)) return false
    return candidate.origin === new URL(developmentUrl).origin
  } catch {
    return false
  }
}

export function restrictedChildEnvironment(
  source: NodeJS.ProcessEnv,
  executablePath = process.execPath
): Record<string, string> {
  const path = [
    dirname(executablePath),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ].filter((entry, index, entries) => entries.indexOf(entry) === index).join(':')
  return Object.fromEntries(Object.entries({
    PATH: path,
    HOME: source.HOME,
    TMPDIR: source.TMPDIR,
    LANG: source.LANG ?? 'en_US.UTF-8',
    LC_ALL: source.LC_ALL,
    NO_COLOR: '1',
    CI: '1',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0'
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function isOutsidePathArgument(value: string): boolean {
  if (isAbsolute(value) || value.startsWith('~')) return true
  return value.split(/[\\/]/).includes('..')
}

import { describe, expect, it } from 'vitest'
import { pathToFileURL } from 'node:url'
import { AttachmentSchema, ChatRequestSchema, ResearchRequestSchema } from '../../src/shared/contracts'
import {
  isPathInside,
  isSafeDevelopmentUrl,
  isTrustedRendererUrl,
  parseApprovedCommand,
  redactSecrets,
  restrictedChildEnvironment
} from '../../src/shared/safety'

describe('IPC contracts', () => {
  it('caps attachments at ten', () => {
    expect(() => ChatRequestSchema.parse({
      conversationId: 'thread', content: 'hello', mode: 'solo', primaryModel: 'gpt',
      attachmentIds: Array.from({ length: 11 }, (_, index) => String(index))
    })).toThrow()
  })

  it('rejects invalid attachment sizes and misleading budget fields', () => {
    expect(() => AttachmentSchema.parse({
      id: 'a', name: 'bad', path: '/tmp/bad', mime: 'text/plain', size: -1, kind: 'text'
    })).toThrow()
    expect(() => ResearchRequestSchema.parse({
      conversationId: 'c', query: 'valid query', depth: 'deep', budgetUsd: 101
    })).toThrow()
  })
})

describe('command safety', () => {
  it('parses allowlisted commands without invoking a shell', () => {
    expect(parseApprovedCommand('git status --short')).toEqual({ binary: 'git', args: ['status', '--short'] })
    expect(parseApprovedCommand('rg "two words" src')).toEqual({ binary: 'rg', args: ['two words', 'src'] })
  })

  it.each([
    'rm -rf /', 'git reset --hard', 'git push', 'git status; whoami', 'npm test | sh',
    'node script.js', 'python3 task.py', 'sudo ls', 'echo $HOME', 'ls /etc', 'rg --pre sh token .'
  ])('blocks unsafe input: %s', (command) => {
    expect(() => parseApprovedCommand(command)).toThrow()
  })

  it('redacts provider secrets from command output', () => {
    expect(redactSecrets('token sk-ant-abcdefghijklmnopqrstuvwxyz123456')).toBe('token [REDACTED_KEY]')
    expect(redactSecrets('token sk-abcdefghijklmnopqrstuvwxyz123456')).toBe('token [REDACTED_KEY]')
  })
})

describe('renderer and process trust boundaries', () => {
  const renderer = '/Applications/Nexus.app/Contents/Resources/app.asar/out/renderer/index.html'

  it('trusts only the exact packaged renderer file', () => {
    expect(isTrustedRendererUrl(pathToFileURL(renderer).href, renderer)).toBe(true)
    expect(isTrustedRendererUrl(pathToFileURL(`${renderer}.evil`).href, renderer)).toBe(false)
    expect(isTrustedRendererUrl('https://nexus.sohamkakra.com', renderer)).toBe(false)
  })

  it('permits loopback development origins without trusting lookalike hosts', () => {
    expect(isSafeDevelopmentUrl('http://localhost:5173')).toBe(true)
    expect(isSafeDevelopmentUrl('https://localhost:5173')).toBe(false)
    expect(isSafeDevelopmentUrl('http://localhost.example.com:5173')).toBe(false)
    expect(isTrustedRendererUrl('http://127.0.0.1:5173/src', renderer, 'http://127.0.0.1:5173')).toBe(true)
    expect(isTrustedRendererUrl('http://127.0.0.1.evil:5173/src', renderer, 'http://127.0.0.1:5173')).toBe(false)
  })

  it('uses path components instead of vulnerable string prefixes', () => {
    expect(isPathInside('/Users/alice', '/Users/alice/project')).toBe(true)
    expect(isPathInside('/Users/alice', '/Users/alice-evil/project')).toBe(false)
  })

  it('passes only a minimal child-process environment', () => {
    const environment = restrictedChildEnvironment({
      HOME: '/Users/alice',
      TMPDIR: '/tmp',
      OPENAI_API_KEY: 'sk-secret',
      ANTHROPIC_API_KEY: 'sk-ant-secret',
      GITHUB_TOKEN: 'secret'
    }, '/opt/homebrew/bin/node')
    expect(environment.HOME).toBe('/Users/alice')
    expect(environment.PATH).toContain('/opt/homebrew/bin')
    expect(environment).not.toHaveProperty('OPENAI_API_KEY')
    expect(environment).not.toHaveProperty('ANTHROPIC_API_KEY')
    expect(environment).not.toHaveProperty('GITHUB_TOKEN')
  })
})

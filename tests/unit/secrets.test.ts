import { beforeEach, describe, expect, it, vi } from 'vitest'

const keytar = vi.hoisted(() => ({
  getPassword: vi.fn(),
  setPassword: vi.fn(),
  deletePassword: vi.fn(),
  findCredentials: vi.fn()
}))

vi.mock('keytar', () => ({ default: keytar }))

import { configuredProviders, getProviderKey, providerCredentials, setProviderKey } from '../../src/main/secrets'

const candidate = 'sk-ant-test-key-that-is-long-enough'

describe('provider credential persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keytar.getPassword.mockResolvedValue(null)
    keytar.setPassword.mockResolvedValue(undefined)
    keytar.deletePassword.mockResolvedValue(true)
    keytar.findCredentials.mockResolvedValue([])
  })

  it('does not save a key when its connection test fails', async () => {
    const testConnection = vi.fn().mockRejectedValue(new Error('invalid x-api-key'))

    await expect(setProviderKey('anthropic', candidate, testConnection)).rejects.toThrow('invalid x-api-key')

    expect(testConnection).toHaveBeenCalledWith(candidate)
    expect(keytar.setPassword).not.toHaveBeenCalled()
    expect(keytar.deletePassword).not.toHaveBeenCalled()
  })

  it('never deletes an existing key when replacement validation fails', async () => {
    keytar.getPassword.mockResolvedValue(candidate)

    await expect(setProviderKey(
      'anthropic',
      candidate,
      () => Promise.reject(new Error('authentication failed'))
    )).rejects.toThrow('authentication failed')

    expect(keytar.setPassword).not.toHaveBeenCalled()
    expect(keytar.deletePassword).not.toHaveBeenCalled()
  })

  it('writes a credential only after the provider accepts it', async () => {
    const testConnection = vi.fn(async () => {
      expect(keytar.setPassword).not.toHaveBeenCalled()
      return ['claude-sonnet']
    })

    await expect(setProviderKey('anthropic', `  ${candidate}  `, testConnection))
      .resolves.toEqual(['claude-sonnet'])

    expect(keytar.setPassword).toHaveBeenCalledWith('com.nexus.desktop', 'anthropic', candidate)
  })

  it('restores all provider credentials with one credential-store request', async () => {
    keytar.findCredentials.mockResolvedValue([
      { account: 'openai', password: 'sk-openai-valid-key-value' },
      { account: 'anthropic', password: candidate },
      { account: 'unrelated', password: 'ignored' }
    ])

    await expect(providerCredentials()).resolves.toEqual({
      openai: 'sk-openai-valid-key-value',
      anthropic: candidate
    })
    await expect(getProviderKey('openai')).resolves.toBe('sk-openai-valid-key-value')
    await expect(configuredProviders()).resolves.toEqual(['openai', 'anthropic'])

    expect(keytar.findCredentials).toHaveBeenCalledTimes(2)
    expect(keytar.getPassword).not.toHaveBeenCalled()
  })
})

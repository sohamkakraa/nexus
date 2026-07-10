import { beforeEach, describe, expect, it, vi } from 'vitest'

const keytar = vi.hoisted(() => ({
  getPassword: vi.fn(),
  setPassword: vi.fn(),
  deletePassword: vi.fn()
}))

vi.mock('keytar', () => ({ default: keytar }))

import { setProviderKey } from '../../src/main/secrets'

const candidate = 'sk-ant-test-key-that-is-long-enough'

describe('provider credential persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keytar.getPassword.mockResolvedValue(null)
    keytar.setPassword.mockResolvedValue(undefined)
    keytar.deletePassword.mockResolvedValue(true)
  })

  it('does not save a key when its connection test fails', async () => {
    const testConnection = vi.fn().mockRejectedValue(new Error('invalid x-api-key'))

    await expect(setProviderKey('anthropic', candidate, testConnection)).rejects.toThrow('invalid x-api-key')

    expect(testConnection).toHaveBeenCalledWith(candidate)
    expect(keytar.setPassword).not.toHaveBeenCalled()
    expect(keytar.deletePassword).not.toHaveBeenCalled()
  })

  it('removes the same rejected key left by an earlier version', async () => {
    keytar.getPassword.mockResolvedValue(candidate)

    await expect(setProviderKey(
      'anthropic',
      candidate,
      () => Promise.reject(new Error('authentication failed'))
    )).rejects.toThrow('authentication failed')

    expect(keytar.setPassword).not.toHaveBeenCalled()
    expect(keytar.deletePassword).toHaveBeenCalledWith('com.nexus.desktop', 'anthropic')
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
})

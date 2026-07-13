import { describe, expect, it } from 'vitest'
import { providerConnectionError } from '../../src/shared/provider-errors'
import { messageOf } from '../../src/renderer/src/errors'

describe('provider connection errors', () => {
  it('turns Anthropic 401 responses into actionable errors without exposing keys', () => {
    const secret = 'sk-ant-secret-that-must-not-escape'
    const error = providerConnectionError('anthropic', {
      status: 401,
      message: `invalid x-api-key: ${secret}`
    })

    expect(error.code).toBe('authentication')
    expect(error.message).toContain('Anthropic')
    expect(error.message).toContain('Connections')
    expect(error.message).toContain('console.anthropic.com')
    expect(error.message).toContain('will not delete')
    expect(error.message).not.toContain(secret)
    expect(error.message).not.toContain('x-api-key')
  })

  it('removes Electron transport prefixes from provider errors', () => {
    expect(messageOf(
      "Error invoking remote method 'provider:save': ProviderConnectionError: Anthropic rejected this API key."
    )).toBe('Anthropic rejected this API key.')
  })

  it('identifies unavailable provider models separately from authentication', () => {
    const error = providerConnectionError('openai', {
      status: 404,
      message: 'model not found'
    })

    expect(error.code).toBe('model-access')
    expect(error.message).toContain('OpenAI')
    expect(error.message).toContain('enabled for this account')
  })
})

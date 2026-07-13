import type { ProviderId } from './contracts'

export type ProviderErrorCode = 'authentication' | 'model-access' | 'rate-limit' | 'connection'

export class ProviderConnectionError extends Error {
  readonly provider: ProviderId
  readonly code: ProviderErrorCode

  constructor(provider: ProviderId, code: ProviderErrorCode, message: string) {
    super(message)
    this.name = 'ProviderConnectionError'
    this.provider = provider
    this.code = code
  }
}

export function providerConnectionError(provider: ProviderId, reason: unknown): ProviderConnectionError {
  const name = provider === 'openai' ? 'OpenAI' : 'Anthropic'
  const consoleName = provider === 'openai' ? 'platform.openai.com' : 'console.anthropic.com'
  const status = errorStatus(reason)
  const details = errorDetails(reason)

  if (status === 401 || /authentication|invalid.{0,20}(api.?key|x-api-key)|incorrect api key|unauthorized/.test(details)) {
    return new ProviderConnectionError(
      provider,
      'authentication',
      `${name} rejected this API key. Nexus will not delete a previously saved key. Verify that it is an API key from ${consoleName}—not a login, subscription, or OAuth token—then replace or refresh it in Connections.`
    )
  }
  if (status === 403 || status === 404 || /model.{0,30}(not found|unavailable|access)|permission/.test(details)) {
    return new ProviderConnectionError(
      provider,
      'model-access',
      `${name} cannot access that model. Refresh ${name} in Connections and choose a model enabled for this account.`
    )
  }
  if (status === 429 || /rate.?limit|quota/.test(details)) {
    return new ProviderConnectionError(
      provider,
      'rate-limit',
      `${name} is rate limited or out of quota. Check the ${name} account limits, then retry.`
    )
  }
  return new ProviderConnectionError(
    provider,
    'connection',
    `${name} model connection failed. Check the network and ${name} account access, then retry from Connections.`
  )
}

function errorStatus(reason: unknown): number | undefined {
  if (!reason || typeof reason !== 'object') return undefined
  const status = Reflect.get(reason, 'status')
  return typeof status === 'number' ? status : undefined
}

function errorDetails(reason: unknown): string {
  if (!reason || typeof reason !== 'object') return String(reason).toLowerCase()
  const message = Reflect.get(reason, 'message')
  const error = Reflect.get(reason, 'error')
  const nested = error && typeof error === 'object'
    ? `${String(Reflect.get(error, 'message') ?? '')} ${String(Reflect.get(error, 'type') ?? '')}`
    : ''
  return `${String(message ?? '')} ${nested}`.toLowerCase()
}

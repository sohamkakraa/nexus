import keytar from 'keytar'
import type { ProviderId } from '../shared/contracts'

const SERVICE = 'com.nexus.desktop'

export async function setProviderKey(provider: ProviderId, key: string): Promise<void> {
  const normalized = key.trim()
  if (normalized.length < 20 || /\s/.test(normalized)) throw new Error('The API key format is not valid.')
  await keytar.setPassword(SERVICE, provider, normalized)
}

export function getProviderKey(provider: ProviderId): Promise<string | null> {
  return keytar.getPassword(SERVICE, provider)
}

export function removeProviderKey(provider: ProviderId): Promise<boolean> {
  return keytar.deletePassword(SERVICE, provider)
}

export async function configuredProviders(): Promise<ProviderId[]> {
  const providers: ProviderId[] = ['openai', 'anthropic']
  const results = await Promise.all(providers.map(async (provider) => [provider, await getProviderKey(provider)] as const))
  return results.filter(([, key]) => Boolean(key)).map(([provider]) => provider)
}

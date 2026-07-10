import keytar from 'keytar'
import type { ProviderId } from '../shared/contracts'
import { platformCapabilities } from './platform'

const SERVICE = 'com.nexus.desktop'

export async function setProviderKey<T>(
  provider: ProviderId,
  key: string,
  testConnection: (candidate: string) => Promise<T>
): Promise<T> {
  const normalized = key.trim()
  if (normalized.length < 20 || /\s/.test(normalized)) throw new Error('The API key format is not valid.')
  const existing = await getProviderKey(provider)
  let result: T
  try {
    result = await testConnection(normalized)
  } catch (error) {
    if (existing === normalized) await removeProviderKey(provider)
    throw error
  }
  try {
    await keytar.setPassword(SERVICE, provider, normalized)
  } catch (error) {
    throw credentialStoreError(error)
  }
  return result
}

export async function getProviderKey(provider: ProviderId): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE, provider)
  } catch (error) {
    throw credentialStoreError(error)
  }
}

export async function removeProviderKey(provider: ProviderId): Promise<boolean> {
  try {
    return await keytar.deletePassword(SERVICE, provider)
  } catch (error) {
    throw credentialStoreError(error)
  }
}

export async function configuredProviders(): Promise<ProviderId[]> {
  const providers: ProviderId[] = ['openai', 'anthropic']
  const results = await Promise.all(providers.map(async (provider) => [
    provider,
    await getProviderKey(provider).catch(() => null)
  ] as const))
  return results.filter(([, key]) => Boolean(key)).map(([provider]) => provider)
}

function credentialStoreError(cause: unknown): Error {
  const store = platformCapabilities().credentialStore
  return new Error(
    `${store} is unavailable. Unlock or configure the operating system credential service, then try again.`,
    { cause }
  )
}

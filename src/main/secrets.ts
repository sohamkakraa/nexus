import keytar from 'keytar'
import type { ProviderId } from '../shared/contracts'
import { platformCapabilities } from './platform'

const SERVICE = 'com.nexus.desktop'
const credentialCache: Partial<Record<ProviderId, string>> = {}

export async function setProviderKey<T>(
  provider: ProviderId,
  key: string,
  testConnection: (candidate: string) => Promise<T>
): Promise<T> {
  const normalized = key.trim()
  if (normalized.length < 20 || /\s/.test(normalized)) throw new Error('The API key format is not valid.')
  const result = await testConnection(normalized)
  try {
    await keytar.setPassword(SERVICE, provider, normalized)
    credentialCache[provider] = normalized
  } catch (error) {
    throw credentialStoreError(error)
  }
  return result
}

export async function getProviderKey(provider: ProviderId): Promise<string | null> {
  if (credentialCache[provider]) return credentialCache[provider] ?? null
  try {
    const key = await keytar.getPassword(SERVICE, provider)
    if (key) credentialCache[provider] = key
    return key
  } catch (error) {
    throw credentialStoreError(error)
  }
}

export async function removeProviderKey(provider: ProviderId): Promise<boolean> {
  try {
    const removed = await keytar.deletePassword(SERVICE, provider)
    delete credentialCache[provider]
    return removed
  } catch (error) {
    throw credentialStoreError(error)
  }
}

export async function configuredProviders(): Promise<ProviderId[]> {
  return Object.keys(await providerCredentials()) as ProviderId[]
}

export async function providerCredentials(): Promise<Partial<Record<ProviderId, string>>> {
  try {
    const credentials = await keytar.findCredentials(SERVICE)
    return credentials.reduce<Partial<Record<ProviderId, string>>>((result, credential) => {
      if ((credential.account === 'openai' || credential.account === 'anthropic') && credential.password) {
        result[credential.account] = credential.password
        credentialCache[credential.account] = credential.password
      }
      return result
    }, {})
  } catch (error) {
    throw credentialStoreError(error)
  }
}

function credentialStoreError(cause: unknown): Error {
  const store = platformCapabilities().credentialStore
  return new Error(
    `${store} is unavailable. Unlock or configure the operating system credential service, then try again.`,
    { cause }
  )
}

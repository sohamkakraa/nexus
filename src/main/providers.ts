import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Attachment, Model, ProviderId } from '../shared/contracts'
import { attachmentPayload } from './files'
import { getProviderKey } from './secrets'

export type GenerateOptions = {
  model: string
  system: string
  prompt: string
  attachments?: Attachment[]
  signal?: AbortSignal
}

export async function discoverProviderModels(provider: ProviderId): Promise<Model[]> {
  const key = await requireKey(provider)
  if (provider === 'openai') {
    const response = await new OpenAI({ apiKey: key }).models.list()
    return response.data
      .map((entry) => toModel('openai', entry.id))
      .filter((model) => model.capabilities.length > 0)
      .sort(sortModels)
  }
  const client = new Anthropic({ apiKey: key })
  const page = await client.models.list({ limit: 100 })
  return page.data.map((entry) => toModel('anthropic', entry.id)).sort(sortModels)
}

export async function generate(provider: ProviderId, options: GenerateOptions): Promise<string> {
  const key = await requireKey(provider)
  return provider === 'openai' ? generateOpenAI(key, options) : generateAnthropic(key, options)
}

export async function generateStreaming(
  provider: ProviderId,
  options: GenerateOptions,
  onDelta: (delta: string) => void
): Promise<string> {
  if (options.attachments?.length) {
    const complete = await generate(provider, options)
    onDelta(complete)
    return complete
  }
  const key = await requireKey(provider)
  if (provider === 'openai') {
    const stream = await new OpenAI({ apiKey: key }).responses.stream({
      model: options.model,
      instructions: options.system,
      input: options.prompt
    }, { signal: options.signal })
    let complete = ''
    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        complete += event.delta
        onDelta(event.delta)
      }
    }
    return complete.trim()
  }
  const stream = new Anthropic({ apiKey: key }).messages.stream({
    model: options.model,
    max_tokens: 4096,
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }]
  }, { signal: options.signal })
  let complete = ''
  stream.on('text', (text) => {
    complete += text
    onDelta(text)
  })
  await stream.finalMessage()
  return complete.trim()
}

export async function createImage(prompt: string, model: string): Promise<string> {
  const key = await requireKey('openai')
  const response = await new OpenAI({ apiKey: key }).images.generate({
    model,
    prompt,
    size: '1024x1024'
  })
  const image = response.data?.[0]
  if (!image) throw new Error('The image model returned no image.')
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  if (image.url) {
    const download = await fetch(image.url, { signal: AbortSignal.timeout(30_000) })
    const contentType = download.headers.get('content-type') ?? ''
    const declaredSize = Number(download.headers.get('content-length') ?? 0)
    if (!download.ok || !contentType.startsWith('image/') || declaredSize > 20 * 1024 * 1024) {
      throw new Error('The generated image could not be downloaded safely.')
    }
    const buffer = Buffer.from(await download.arrayBuffer())
    if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('The generated image exceeds the 20 MB safety limit.')
    return `data:${contentType};base64,${buffer.toString('base64')}`
  }
  throw new Error('The image response format was not recognized.')
}

export async function transcribe(path: string, model: string): Promise<string> {
  const { createReadStream } = await import('node:fs')
  const key = await requireKey('openai')
  const result = await new OpenAI({ apiKey: key }).audio.transcriptions.create({
    file: createReadStream(path),
    model
  })
  return result.text
}

export async function research(query: string, depth: 'quick' | 'deep' | 'auto', signal?: AbortSignal): Promise<string> {
  const key = await requireKey('openai')
  const model = depth === 'deep' ? 'o4-mini-deep-research' : 'gpt-5.4'
  const boundedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(depth === 'deep' ? 10 * 60_000 : 3 * 60_000)])
    : AbortSignal.timeout(depth === 'deep' ? 10 * 60_000 : 3 * 60_000)
  const response = await new OpenAI({ apiKey: key }).responses.create({
    model,
    input: `Research this question and produce a concise report with inline source citations and a Sources section: ${query}`,
    tools: [{ type: 'web_search' }],
    reasoning: { summary: 'auto' },
    max_output_tokens: depth === 'deep' ? 8_000 : 3_000,
    max_tool_calls: depth === 'deep' ? 12 : depth === 'auto' ? 8 : 4
  } as never, { signal: boundedSignal })
  return response.output_text.trim()
}

export async function createRealtimeSession(model: string): Promise<{ clientSecret: string; model: string }> {
  const key = await requireKey('openai')
  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: { type: 'realtime', model } })
  })
  const payload = await response.json() as { value?: string; client_secret?: { value?: string }; error?: { message?: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? 'Could not start the realtime session.')
  const clientSecret = payload.value ?? payload.client_secret?.value
  if (!clientSecret) throw new Error('The realtime service returned no client secret.')
  return { clientSecret, model }
}

async function generateOpenAI(key: string, options: GenerateOptions): Promise<string> {
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: options.prompt }]
  for (const attachment of options.attachments ?? []) {
    const payload = await attachmentPayload(attachment)
    if (attachment.kind === 'image') {
      content.push({ type: 'input_image', image_url: `data:${attachment.mime};base64,${payload.base64}`, detail: 'auto' })
    } else if (payload.text) {
      content.push({ type: 'input_text', text: `\n\nFile: ${attachment.name}\n${payload.text}` })
    } else {
      content.push({ type: 'input_file', filename: attachment.name, file_data: `data:${attachment.mime};base64,${payload.base64}` })
    }
  }
  const response = await new OpenAI({ apiKey: key }).responses.create({
    model: options.model,
    instructions: options.system,
    input: [{ role: 'user', content }] as never,
  }, { signal: options.signal })
  return response.output_text.trim()
}

async function generateAnthropic(key: string, options: GenerateOptions): Promise<string> {
  const content: Array<Record<string, unknown>> = []
  for (const attachment of options.attachments ?? []) {
    const payload = await attachmentPayload(attachment)
    if (attachment.kind === 'image') {
      content.push({ type: 'image', source: { type: 'base64', media_type: attachment.mime, data: payload.base64 } })
    } else if (payload.text) {
      content.push({ type: 'text', text: `File: ${attachment.name}\n${payload.text}` })
    } else if (attachment.kind === 'pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: payload.base64 } })
    }
  }
  content.push({ type: 'text', text: options.prompt })
  const response = await new Anthropic({ apiKey: key }).messages.create({
    model: options.model,
    max_tokens: 4096,
    system: options.system,
    messages: [{ role: 'user', content: content as never }]
  }, { signal: options.signal })
  return response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim()
}

async function requireKey(provider: ProviderId): Promise<string> {
  const key = await getProviderKey(provider)
  if (!key) throw new Error(`Connect ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} in Settings first.`)
  return key
}

function toModel(provider: ProviderId, id: string): Model {
  const lower = id.toLowerCase()
  const capabilities: Model['capabilities'] = []
  if (/gpt|o\d|claude/.test(lower) && !/embed|moderation/.test(lower)) capabilities.push('text', 'tools')
  if (/gpt|claude/.test(lower) && !/mini-tts|audio|whisper/.test(lower)) capabilities.push('vision')
  if (/image|dall-e/.test(lower)) capabilities.push('image')
  if (/realtime|audio/.test(lower)) capabilities.push('realtime')
  if (/whisper|transcri/.test(lower)) capabilities.push('transcription')
  if (/deep-research/.test(lower)) capabilities.push('research')
  return { id, provider, label: id.replaceAll('-', ' '), capabilities: [...new Set(capabilities)] }
}

function sortModels(a: Model, b: Model): number {
  const aText = a.capabilities.includes('text') ? 0 : 1
  const bText = b.capabilities.includes('text') ? 0 : 1
  return aText - bText || b.id.localeCompare(a.id)
}

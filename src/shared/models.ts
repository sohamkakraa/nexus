import type { Model, ProviderId } from './contracts'

type Capability = Model['capabilities'][number]

const OPENAI_LIMITS: Partial<Record<Capability, number>> = {
  text: 8,
  image: 2,
  realtime: 4,
  transcription: 2,
  research: 2
}

export function curateProviderModels(provider: ProviderId, availableIds: string[]): Model[] {
  const candidates = [...new Set(availableIds)]
    .map((id) => classifyModel(provider, id))
    .filter((model): model is Model => model !== null)

  if (provider === 'anthropic') {
    return selectLatest(candidates, 3, anthropicFamily).sort(sortModels)
  }

  const selected = new Map<string, Model>()
  for (const capability of ['text', 'image', 'realtime', 'transcription', 'research'] as const) {
    const candidatesForCapability = preferredCapabilityCandidates(
      capability,
      candidates.filter((model) => model.capabilities.includes(capability))
    )
    const family = capability === 'text' ? openAiTextFamily : modelStem
    for (const model of selectLatest(candidatesForCapability, OPENAI_LIMITS[capability] ?? 0, family)) {
      selected.set(model.id, model)
    }
  }
  return [...selected.values()].sort(sortModels)
}

export function defaultModelForCapability(
  available: Model[],
  capability: Capability,
  preferredProvider?: ProviderId
): Model | undefined {
  const capable = available.filter((model) => model.capabilities.includes(capability))
  const preferred = preferredProvider ? capable.filter((model) => model.provider === preferredProvider) : []
  return (preferred.length ? preferred : capable).slice().sort(compareLatest)[0]
}

function preferredCapabilityCandidates(capability: Capability, candidates: Model[]): Model[] {
  if (capability === 'image' && candidates.some((model) => model.id.toLowerCase().startsWith('gpt-image'))) {
    return candidates.filter((model) => model.id.toLowerCase().startsWith('gpt-image'))
  }
  if (capability === 'transcription' && candidates.some((model) => /gpt.*transcri/.test(model.id.toLowerCase()))) {
    return candidates.filter((model) => /gpt.*transcri/.test(model.id.toLowerCase()))
  }
  return candidates
}

function classifyModel(provider: ProviderId, id: string): Model | null {
  const lower = id.toLowerCase()
  if (provider === 'anthropic') {
    if (!lower.startsWith('claude-')) return null
    return model(provider, id, ['text', 'vision', 'tools'])
  }

  if (/deep-research/.test(lower)) return model(provider, id, ['research'])
  if (/transcri|whisper/.test(lower)) return model(provider, id, ['transcription'])
  if (/realtime|gpt-live/.test(lower)) return model(provider, id, ['realtime'])
  if (/image|dall-e/.test(lower)) return model(provider, id, ['image'])
  if (/embed|moderation|tts|speech|sora|search|instruct|codex/.test(lower)) return null
  if (/audio/.test(lower)) return null
  if (/^(gpt-|o\d)/.test(lower)) return model(provider, id, ['text', 'vision', 'tools'])
  return null
}

function model(provider: ProviderId, id: string, capabilities: Capability[]): Model {
  return {
    id,
    provider,
    label: modelLabel(id),
    capabilities,
    // Metadata enriches an ID only after the provider reports it; it never grants or fabricates availability.
    ...catalogMetadata(id)
  }
}

function selectLatest(
  candidates: Model[],
  limit: number,
  familyFor: (model: Model) => string
): Model[] {
  const selected = new Map<string, Model>()
  for (const candidate of candidates.slice().sort(compareLatest)) {
    const family = familyFor(candidate)
    if (!selected.has(family)) selected.set(family, candidate)
    if (selected.size === limit) break
  }
  return [...selected.values()]
}

function anthropicFamily(model: Model): string {
  const tier = model.id.toLowerCase().match(/claude-(opus|sonnet|haiku)/)?.[1]
  return tier ?? modelStem(model)
}

function openAiTextFamily(model: Model): string {
  const lower = model.id.toLowerCase()
  const tier = lower.match(/gpt-\d+(?:\.\d+)?-(sol|terra|luna)/)?.[1]
  if (tier) return `gpt-${tier}`
  const size = /nano/.test(lower) ? 'nano' : /mini/.test(lower) ? 'mini' : /pro/.test(lower) ? 'pro' : 'flagship'
  return `${lower.startsWith('o') ? 'reasoning' : 'gpt'}-${size}`
}

function modelStem(model: Model): string {
  return model.id
    .toLowerCase()
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-\d{8}$/, '')
}

function compareLatest(a: Model, b: Model): number {
  const stemOrder = modelStem(b).localeCompare(modelStem(a), undefined, { numeric: true })
  if (stemOrder) return stemOrder
  const aSnapshot = modelStem(a) === a.id.toLowerCase() ? 0 : 1
  const bSnapshot = modelStem(b) === b.id.toLowerCase() ? 0 : 1
  return aSnapshot - bSnapshot || b.id.localeCompare(a.id, undefined, { numeric: true })
}

function sortModels(a: Model, b: Model): number {
  const capabilityOrder: Capability[] = ['text', 'image', 'realtime', 'transcription', 'research', 'vision', 'tools']
  const aOrder = capabilityOrder.findIndex((capability) => a.capabilities.includes(capability))
  const bOrder = capabilityOrder.findIndex((capability) => b.capabilities.includes(capability))
  return aOrder - bOrder || compareLatest(a, b)
}

function modelLabel(id: string): string {
  return id
    .replace(/^gpt-/i, 'GPT-')
    .replace(/^claude-/i, 'Claude ')
    .replaceAll('-', ' ')
    .replace(/\b(sol|terra|luna|opus|sonnet|haiku)\b/gi, (value) => value[0].toUpperCase() + value.slice(1))
}

function catalogMetadata(id: string): Partial<Model> {
  const lower = id.toLowerCase()
  if (/^gpt-5\.6(?:-sol)?(?:-\d{4}-\d{2}-\d{2})?$/.test(lower)) {
    return {
      contextWindow: 1_050_000,
      maxOutputTokens: 128_000,
      reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      reasoningModes: ['standard', 'pro']
    }
  }
  if (/^gpt-realtime-2(?:\.\d+)?(?:-|$)/.test(lower)) {
    return {
      contextWindow: 128_000,
      maxOutputTokens: 32_000,
      reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh']
    }
  }
  if (/^gpt-(?:[5-9]|\d{2})/.test(lower) || /^o\d/.test(lower)) {
    return { reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'] }
  }
  if (/realtime|gpt-live/.test(lower)) {
    return { reasoningEfforts: ['minimal', 'low', 'medium', 'high'] }
  }
  return {}
}

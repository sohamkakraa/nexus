import { describe, expect, it } from 'vitest'
import { curateProviderModels, defaultModelForCapability } from '../../src/shared/models'

describe('provider model curation', () => {
  it('keeps a bounded, current subset of account-available OpenAI models', () => {
    const available = [
      'gpt-4-0613',
      'gpt-4.1',
      'gpt-4.1-2025-04-14',
      'gpt-5',
      'gpt-5-2026-01-01',
      'gpt-5-mini',
      'o3',
      'o4-mini',
      'text-embedding-3-large',
      'omni-moderation-latest',
      'dall-e-2',
      'gpt-image-1',
      'gpt-image-1-2025-06-01',
      'gpt-4o-realtime-preview-2024-12-17',
      'gpt-realtime',
      'whisper-1',
      'gpt-4o-transcribe',
      'o3-deep-research'
    ]

    const curated = curateProviderModels('openai', available)
    const ids = curated.map((model) => model.id)

    expect(ids.length).toBeLessThanOrEqual(13)
    expect(ids.every((id) => available.includes(id))).toBe(true)
    expect(ids).toEqual(expect.arrayContaining([
      'gpt-5',
      'gpt-5-mini',
      'o3',
      'o4-mini',
      'gpt-image-1',
      'gpt-realtime',
      'gpt-4o-transcribe',
      'o3-deep-research'
    ]))
    expect(ids).not.toEqual(expect.arrayContaining([
      'gpt-4-0613',
      'gpt-4.1-2025-04-14',
      'gpt-5-2026-01-01',
      'text-embedding-3-large',
      'dall-e-2',
      'whisper-1'
    ]))

    const capabilities = Object.fromEntries(curated.map((model) => [model.id, model.capabilities]))
    expect(capabilities['gpt-image-1']).toEqual(['image'])
    expect(capabilities['gpt-realtime']).toEqual(['realtime'])
    expect(capabilities['gpt-4o-transcribe']).toEqual(['transcription'])
    expect(capabilities['o3-deep-research']).toEqual(['research'])
  })

  it('keeps only the latest account-listed Anthropic model in each tier', () => {
    const available = [
      'claude-opus-4-1',
      'claude-opus-4-6',
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-6',
      'claude-haiku-3-5-20241022',
      'claude-haiku-4-5-20251001'
    ]

    const curated = curateProviderModels('anthropic', available)

    expect(curated.map((model) => model.id)).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001'
    ])
    expect(curated.every((model) => available.includes(model.id))).toBe(true)
    expect(curated.every((model) => model.capabilities.includes('text'))).toBe(true)
  })

  it('discovers newer account models without a fixed availability whitelist', () => {
    const available = [
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-realtime-2',
      'gpt-live-1',
      'gpt-image-2',
      'gpt-realtime-whisper'
    ]
    const curated = curateProviderModels('openai', available)

    expect(curated.map((model) => model.id)).toEqual(expect.arrayContaining(available))
    expect(curated.every((model) => available.includes(model.id))).toBe(true)
    expect(curated.find((model) => model.id === 'gpt-live-1')?.capabilities).toContain('realtime')
    expect(curated.find((model) => model.id === 'gpt-5.6-sol')).toMatchObject({
      contextWindow: 1_050_000,
      reasoningModes: ['standard', 'pro']
    })
  })

  it('selects the newest account-available default independently for each use case', () => {
    const models = curateProviderModels('openai', [
      'gpt-5.4',
      'gpt-5.7',
      'gpt-image-2',
      'gpt-image-3',
      'gpt-realtime-2',
      'gpt-realtime-2.1',
      'gpt-4o-transcribe'
    ])

    expect(defaultModelForCapability(models, 'text', 'openai')?.id).toBe('gpt-5.7')
    expect(defaultModelForCapability(models, 'image', 'openai')?.id).toBe('gpt-image-3')
    expect(defaultModelForCapability(models, 'realtime', 'openai')?.id).toBe('gpt-realtime-2.1')
  })

  it('preserves provider-reported release and thinking metadata', () => {
    const models = curateProviderModels('anthropic', [{
      id: 'claude-future-model',
      label: 'Claude Future Model',
      created: 1_800_000_000,
      contextWindow: 750_000,
      maxOutputTokens: 64_000,
      reasoningEfforts: ['low', 'medium', 'high', 'xhigh'],
      supportsAdaptiveThinking: true
    }])
    expect(models[0]).toMatchObject({
      id: 'claude-future-model',
      label: 'Claude Future Model',
      releasedAt: 1_800_000_000,
      contextWindow: 750_000,
      reasoningEfforts: ['low', 'medium', 'high', 'xhigh'],
      supportsAdaptiveThinking: true
    })
  })
})

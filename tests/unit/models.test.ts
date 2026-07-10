import { describe, expect, it } from 'vitest'
import { curateProviderModels } from '../../src/shared/models'

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
})

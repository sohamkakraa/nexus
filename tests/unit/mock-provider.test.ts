import { describe, expect, it, vi } from 'vitest'
import { createMockNexus } from '../fixtures/mockNexus'
import { EXECUTABLE_SCENARIOS, PERSONAS } from '../fixtures/personas'

describe('mocked provider scenarios', () => {
  it('defines all representative personas as executable fixtures', () => {
    expect(EXECUTABLE_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      'novice', 'researcher', 'developer', 'privacy', 'accessibility', 'failing'
    ])
    expect(EXECUTABLE_SCENARIOS.every((scenario) => scenario.goal.length > 30)).toBe(true)
  })

  it('completes a Council turn without any network call', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const mock = createMockNexus(PERSONAS.researcher)
    const conversation = await mock.api.createConversation('council')
    await mock.api.sendMessage({
      conversationId: conversation.id,
      content: 'Compare both paths.',
      mode: 'council',
      primaryModel: 'gpt-5.6-sol',
      secondaryModel: 'claude-sonnet-5',
      attachmentIds: []
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mock.snapshot().conversations[0]?.messages).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it('returns a provider failure without attempting a real request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const mock = createMockNexus(PERSONAS.failing)
    const conversation = await mock.api.createConversation('council')

    await expect(mock.api.sendMessage({
      conversationId: conversation.id,
      content: 'This should fail locally.',
      mode: 'council',
      primaryModel: 'gpt-5.6-sol',
      secondaryModel: 'claude-sonnet-5',
      attachmentIds: []
    })).rejects.toThrow('Provider is unreachable')
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

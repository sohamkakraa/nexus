import { nanoid } from 'nanoid'
import type { Attachment, ChatRequest, Message, ProviderId } from '../shared/contracts'
import { insertMessage, listConversations, refreshRollingMemory, renameConversation, rollingMemory, searchMemory } from './database'
import { getPrivacySettings } from './privacy'
import { generate, generateStreaming } from './providers'

const BASE_SYSTEM = `You are participating in Nexus, a careful desktop AI assistant.
Give direct, useful answers. Use supplied files as evidence and state uncertainty.
If one essential fact is missing, respond only with NEEDS_CLARIFICATION: followed by one focused question.
Never claim that a tool ran unless its result is included. Do not reveal hidden chain-of-thought; provide concise conclusions and evidence.`

export async function runChat(
  request: ChatRequest,
  attachments: Attachment[],
  signal?: AbortSignal,
  onDelta: (delta: string) => void = () => undefined
): Promise<Message> {
  const conversation = listConversations().find((item) => item.id === request.conversationId)
  if (!conversation) throw new Error('Conversation not found.')
  const now = new Date().toISOString()
  const userMessage: Message = {
    id: nanoid(), conversationId: request.conversationId, role: 'user',
    content: request.content, createdAt: now, attachments
  }
  const context = buildContext(conversation.messages, request.content, conversation.id)
  const system = await systemPrompt()
  const content = request.mode === 'council' && request.secondaryModel
    ? await runCouncil(request, context, attachments, system, signal, onDelta)
    : await generateStreaming(providerFor(request.primaryModel), {
      model: request.primaryModel, system, prompt: context, attachments, signal
    }, onDelta)

  const assistantMessage: Message = {
    id: nanoid(), conversationId: request.conversationId, role: 'assistant',
    content: normalizeClarification(content), author: request.mode === 'council' ? 'Nexus Council' : request.primaryModel,
    createdAt: new Date().toISOString(), attachments: []
  }
  insertMessage(userMessage)
  if (conversation.messages.length === 0) renameConversation(conversation.id, titleFrom(request.content))
  insertMessage(assistantMessage)
  refreshRollingMemory(request.conversationId)
  return assistantMessage
}

async function runCouncil(
  request: ChatRequest,
  context: string,
  attachments: Attachment[],
  system: string,
  signal?: AbortSignal,
  onDelta: (delta: string) => void = () => undefined
): Promise<string> {
  const firstModel = request.primaryModel
  const secondModel = request.secondaryModel!
  const [firstDraft, secondDraft] = await Promise.all([
    generate(providerFor(firstModel), {
      model: firstModel, system: `${system}\nCreate an independent proposed answer for another expert to review.`,
      prompt: context, attachments, signal
    }),
    generate(providerFor(secondModel), {
      model: secondModel, system: `${system}\nCreate an independent proposed answer for another expert to review.`,
      prompt: context, attachments, signal
    })
  ])

  const clarification = [firstDraft, secondDraft].find((draft) => draft.startsWith('NEEDS_CLARIFICATION:'))
  if (clarification) return clarification

  const critiquePrompt = `${context}\n\nTwo proposed answers:\nA (${firstModel}): ${firstDraft}\n\nB (${secondModel}): ${secondDraft}
\nCompare the proposals. List only concrete agreements, conflicts, and corrections. Do not discuss hidden reasoning.`
  const critique = await generate(providerFor(secondModel), {
    model: secondModel, system, prompt: critiquePrompt, signal
  })

  return generateStreaming(providerFor(firstModel), {
    model: firstModel,
    system: `${system}\nAct as editor for a two-model council. Return one polished answer. Attribute material disagreements briefly when they remain.`,
    prompt: `${critiquePrompt}\n\nReviewer notes:\n${critique}\n\nProduce the final response now.`,
    signal
  }, onDelta)
}

function buildContext(messages: Message[], prompt: string, conversationId: string): string {
  const recent = messages.slice(-14).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')
  const memories = searchMemory(conversationId, prompt).filter((item) => !recent.includes(item))
  const summary = rollingMemory(conversationId)
  return [
    summary ? `Rolling conversation memory:\n${summary}` : '',
    memories.length ? `Relevant earlier context:\n${memories.join('\n---\n')}` : '',
    recent ? `Recent conversation:\n${recent}` : '',
    `Current request:\n${prompt}`
  ].filter(Boolean).join('\n\n')
}

function providerFor(model: string): ProviderId {
  return model.toLowerCase().includes('claude') ? 'anthropic' : 'openai'
}

function normalizeClarification(content: string): string {
  return content.startsWith('NEEDS_CLARIFICATION:')
    ? `I need one detail before I continue: ${content.slice('NEEDS_CLARIFICATION:'.length).trim()}`
    : content
}

function titleFrom(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim()
  return compact.length > 48 ? `${compact.slice(0, 47)}…` : compact
}

async function systemPrompt(): Promise<string> {
  const settings = await getPrivacySettings()
  if (!settings.personalizationEnabled || !settings.personalizationNotes.trim()) return BASE_SYSTEM
  return `${BASE_SYSTEM}\n\nUser-enabled local personalization notes:\n${settings.personalizationNotes.trim()}`
}

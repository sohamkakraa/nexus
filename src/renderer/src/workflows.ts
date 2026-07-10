export type WorkflowId =
  | 'decision'
  | 'research'
  | 'document'
  | 'image'
  | 'meeting'
  | 'connector'
  | 'terminal'
  | 'custom'

export type WorkflowDefinition = {
  id: WorkflowId
  title: string
  shortLabel: string
  description: string
  mode: 'solo' | 'council'
  instruction: string
  context: string[]
  safety: string
}

export type WorkflowDraft = {
  id: WorkflowId
  title: string
  mode: 'solo' | 'council'
  instruction: string
  context: string[]
}

export const WORKFLOWS: readonly WorkflowDefinition[] = [
  {
    id: 'decision',
    title: 'Council decision',
    shortLabel: 'Decision',
    description: 'Frame options, surface disagreement, and produce a reasoned recommendation.',
    mode: 'council',
    instruction: 'Decision to make:\n\nOptions under consideration:\n\nConstraints and non-negotiables:\n\nWhat would change my mind:',
    context: ['Decision criteria', 'Trade-offs', 'Dissent', 'Recommendation'],
    safety: 'Produces a reviewable recommendation; it does not take the decision for you.'
  },
  {
    id: 'research',
    title: 'Research brief',
    shortLabel: 'Research',
    description: 'Turn a question into a scoped brief with evidence gaps and citations.',
    mode: 'council',
    instruction: 'Research question:\n\nAudience and decision this supports:\n\nScope and exclusions:\n\nEvidence standard:',
    context: ['Question', 'Scope', 'Sources', 'Uncertainty'],
    safety: 'Research tools run only after you choose a depth and budget.'
  },
  {
    id: 'document',
    title: 'Document review',
    shortLabel: 'Review',
    description: 'Review an attached document from author and challenger perspectives.',
    mode: 'council',
    instruction: 'Review goal:\n\nIntended reader:\n\nFocus areas:\n\nReturn findings as:',
    context: ['Attachment', 'Audience', 'Risk', 'Revision plan'],
    safety: 'Attach a local copy; you can remove it before sending.'
  },
  {
    id: 'image',
    title: 'Image studio',
    shortLabel: 'Image',
    description: 'Develop a visual direction, critique it, then prepare a generation prompt.',
    mode: 'council',
    instruction: 'Image objective:\n\nSubject and setting:\n\nComposition, material, and light:\n\nAvoid:',
    context: ['Art direction', 'Composition', 'Constraints', 'Generation prompt'],
    safety: 'Image generation is a separate explicit action in the tool dock.'
  },
  {
    id: 'meeting',
    title: 'Meeting / call transcript',
    shortLabel: 'Meeting',
    description: 'Turn a recording or transcript into decisions, owners, and open questions.',
    mode: 'council',
    instruction: 'Meeting purpose:\n\nParticipants or roles:\n\nWhat to extract:\n- Decisions\n- Owners and dates\n- Open questions\n\nAdditional context:',
    context: ['Recording', 'Decisions', 'Owners', 'Follow-ups'],
    safety: 'Microphone access and transcript saving remain separate, explicit choices.'
  },
  {
    id: 'connector',
    title: 'Connector task',
    shortLabel: 'Connector',
    description: 'Plan a read or write through an MCP connector before any tool is called.',
    mode: 'council',
    instruction: 'Outcome needed:\n\nConnector or system:\n\nAllowed reads:\n\nProposed writes requiring approval:',
    context: ['Connector', 'Allowed scope', 'Proposed calls', 'Approval'],
    safety: 'Connecting inspects tools; write-capable calls still require approval.'
  },
  {
    id: 'terminal',
    title: 'Terminal / system task',
    shortLabel: 'Terminal',
    description: 'Plan a local command or macOS action with boundaries visible first.',
    mode: 'council',
    instruction: 'Local outcome:\n\nWorking directory or app:\n\nCommands or actions to consider:\n\nDo not change:',
    context: ['Goal', 'Environment', 'Command plan', 'Approval'],
    safety: 'Commands and system actions are never executed by selecting this workflow.'
  },
  {
    id: 'custom',
    title: 'Custom workflow',
    shortLabel: 'Custom',
    description: 'Start with an editable brief and choose how the Council should contribute.',
    mode: 'council',
    instruction: 'Outcome:\n\nContext:\n\nConstraints:\n\nUseful form of the result:',
    context: ['Outcome', 'Context', 'Constraints', 'Output'],
    safety: 'A custom workflow only prepares your working brief.'
  }
] as const

export function getWorkflow(id: WorkflowId): WorkflowDefinition {
  return WORKFLOWS.find((workflow) => workflow.id === id) ?? WORKFLOWS[WORKFLOWS.length - 1]
}

export function configureWorkflow(id: WorkflowId): WorkflowDraft {
  const workflow = getWorkflow(id)
  return {
    id: workflow.id,
    title: workflow.title,
    mode: workflow.mode,
    instruction: workflow.instruction,
    context: [...workflow.context]
  }
}

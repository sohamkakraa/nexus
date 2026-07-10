import { describe, expect, it } from 'vitest'
import { configureWorkflow, WORKFLOWS } from '../../src/renderer/src/workflows'

describe('guided workflows', () => {
  it('covers every supported work shape', () => {
    expect(WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      'decision', 'research', 'document', 'image', 'meeting', 'connector', 'terminal', 'custom'
    ])
  })

  it.each(WORKFLOWS)('configures $title without executing a tool', (workflow) => {
    const configured = configureWorkflow(workflow.id)
    expect(configured.title).toBe(workflow.title)
    expect(configured.instruction.length).toBeGreaterThan(20)
    expect(configured.context.length).toBeGreaterThan(2)
    expect(configured.context).not.toBe(workflow.context)
  })

  it('keeps external and system workflows explicit', () => {
    const risky = WORKFLOWS.filter((workflow) => ['research', 'image', 'connector', 'terminal', 'meeting'].includes(workflow.id))
    expect(risky.every((workflow) => /explicit|separate|approval|only after|never executed/i.test(workflow.safety))).toBe(true)
  })
})

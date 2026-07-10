import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { generate } from './providers'

export const SkillSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,50}$/),
  name: z.string().min(2).max(80),
  description: z.string().max(500),
  instructions: z.string().min(10).max(20_000),
  allowedTools: z.array(z.string()).max(24).default([]),
  enabled: z.boolean().default(false),
  version: z.number().int().positive().default(1)
})
export type Skill = z.infer<typeof SkillSchema>

export async function listSkills(): Promise<Skill[]> {
  try {
    return z.array(SkillSchema).parse(JSON.parse(await readFile(skillPath(), 'utf8')))
  } catch {
    return []
  }
}

export async function saveSkill(input: Skill): Promise<Skill> {
  const skill = SkillSchema.parse(input)
  const skills = await listSkills()
  const next = [...skills.filter((item) => item.id !== skill.id), skill]
  const directory = join(app.getPath('userData'), 'skills')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await writeFile(skillPath(), JSON.stringify(next, null, 2), { mode: 0o600 })
  return skill
}

export async function generateSkill(description: string, model: string): Promise<Skill> {
  if (description.trim().length < 10) throw new Error('Describe what the skill should do in a little more detail.')
  const response = await generate(model.toLowerCase().includes('claude') ? 'anthropic' : 'openai', {
    model,
    system: `Design a safe declarative Nexus skill. Return only JSON with:
{"id":"kebab-case","name":"Name","description":"Short purpose","instructions":"Precise operating instructions and boundaries","allowedTools":["tool-name"],"enabled":false,"version":1}
Never include executable code, credentials, or instructions to bypass user approval.`,
    prompt: description
  })
  const json = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { throw new Error('The model did not return a valid skill definition.') }
  const skill = SkillSchema.parse(parsed)
  return saveSkill({ ...skill, enabled: false })
}

function skillPath(): string {
  return join(app.getPath('userData'), 'skills', 'registry.json')
}

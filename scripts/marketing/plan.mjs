import { readFile, writeFile } from 'node:fs/promises'

const source = new URL('../../marketing/calendar.json', import.meta.url)
const calendar = JSON.parse(await readFile(source, 'utf8'))

if (calendar.paidSpendUsd !== 0) throw new Error('Marketing automation must keep paid spend at zero.')
if (calendar.requiresHumanApproval !== true) throw new Error('Every campaign must require human approval.')
if (!Number.isInteger(calendar.maximumPostsPerWeek) || calendar.maximumPostsPerWeek < 1 || calendar.maximumPostsPerWeek > 3) {
  throw new Error('The posting cap must be between one and three posts per week.')
}
if (!Array.isArray(calendar.campaigns) || calendar.campaigns.length > 4) throw new Error('At most four campaign weeks are allowed.')

const plan = {
  generatedAt: new Date().toISOString(),
  mode: 'dry-run',
  credentialsRequired: false,
  publishesContent: false,
  createsAccounts: false,
  paidSpendUsd: 0,
  maximumPostsPerWeek: calendar.maximumPostsPerWeek,
  approval: 'required before any platform integration may publish',
  campaigns: calendar.campaigns
}

await writeFile(process.argv[2] ?? 'marketing-plan.json', `${JSON.stringify(plan, null, 2)}\n`)

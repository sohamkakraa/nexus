import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('onboards into a Council conversation', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'nexus-e2e-'))
  const { ELECTRON_RUN_AS_NODE: _ignored, ...safeEnvironment } = process.env
  const executablePath = process.env.NEXUS_EXECUTABLE
  const app = await electron.launch({
    ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
    env: {
      ...Object.fromEntries(Object.entries(safeEnvironment).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      NEXUS_USER_DATA_DIR: userData
    }
  })
  try {
    const page = await app.firstWindow()
    await test.step('render the workspace', async () => {
      await expect(page).toHaveTitle('Nexus')
      await expect(page.getByTestId('app')).toBeVisible()
    })
    await test.step('inspect provider onboarding', async () => {
      const onboarding = page.getByRole('heading', { name: 'Connect your models' })
      if (!(await onboarding.isVisible())) await page.getByRole('button', { name: 'Connections' }).click()
      await expect(onboarding).toBeVisible()
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Bring the difficult part.' })).toBeVisible()
    })
    await test.step('create a Council thread', async () => {
      const outcome = await page.evaluate(async () => {
        const api = (window as unknown as { nexus: { createConversation(mode: string): Promise<{ id: string }> } }).nexus
        return Promise.race([
          api.createConversation('council').then((value) => `created:${value.id}`).catch((error: unknown) => `error:${String(error)}`),
          new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 3_000))
        ])
      })
      if (!outcome.startsWith('created:')) throw new Error(`Conversation IPC ${outcome}`)
      await expect(page.getByRole('heading', { name: 'New conversation' })).toBeVisible()
      await expect(page.getByText('Council', { exact: true })).toBeVisible()
    })
  } finally {
    await app.close()
    await rm(userData, { recursive: true, force: true })
  }
})

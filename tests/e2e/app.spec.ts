import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('opens the production Electron Council workspace', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'nexus-e2e-'))
  const { ELECTRON_RUN_AS_NODE: _ignored, ...safeEnvironment } = process.env
  const executablePath = process.env.NEXUS_EXECUTABLE
  const app = await electron.launch({
    ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
    env: {
      ...Object.fromEntries(Object.entries(safeEnvironment).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      NEXUS_USER_DATA_DIR: userData,
      NEXUS_DISABLE_PROVIDER_RESTORE: '1'
    }
  })
  try {
    const page = await app.firstWindow()
    let createdId = ''
    await test.step('render the workspace', async () => {
      await expect(page).toHaveTitle('Nexus')
      await expect(page.getByTestId('app')).toBeVisible()
    })
    await test.step('inspect provider onboarding', async () => {
      await expect(page.getByRole('heading', { name: 'Start with a question.' })).toBeVisible()
      await page.getByRole('button', { name: 'Connections' }).click()
      await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible()
      await expect(page.getByText(/currently available models/)).toBeVisible()
      await page.getByRole('button', { name: 'Close connections' }).click()
    })
    await test.step('create work through the trusted preload', async () => {
      const outcome = await page.evaluate(async () => {
        const api = (window as unknown as { nexus: { createConversation(mode: string): Promise<{ id: string }> } }).nexus
        return Promise.race([
          api.createConversation('council').then((value) => `created:${value.id}`).catch((error: unknown) => `error:${String(error)}`),
          new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 3_000))
        ])
      })
      if (!outcome.startsWith('created:')) throw new Error(`Conversation IPC ${outcome}`)
      createdId = outcome.slice('created:'.length)
      await expect(page.getByRole('heading', { name: 'New conversation' })).toBeVisible()
    })
    await test.step('persist conversation history actions', async () => {
      const state = await page.evaluate(async (id) => {
        const api = (window as unknown as { nexus: {
          setConversationPinned(id: string, pinned: boolean): Promise<void>
          setConversationArchived(id: string, archived: boolean): Promise<void>
          getSnapshot(): Promise<{ conversations: Array<{ id: string; pinned: boolean; archived: boolean }> }>
        } }).nexus
        await api.setConversationPinned(id, true)
        await api.setConversationArchived(id, true)
        return (await api.getSnapshot()).conversations.find((conversation) => conversation.id === id)
      }, createdId)
      expect(state).toMatchObject({ pinned: false, archived: true })
    })
    await test.step('prepare a Council workflow without provider calls', async () => {
      await page.locator('.new-work').click()
      await expect(page.getByRole('heading', { name: 'Choose a working method' })).toBeVisible()
      await page.getByRole('button', { name: /Council decision/ }).click()
      await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue(/Decision to make/)
      await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled()
    })
  } finally {
    await app.close()
    await rm(userData, { recursive: true, force: true })
  }
})

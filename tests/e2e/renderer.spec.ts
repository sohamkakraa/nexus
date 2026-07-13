import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

type Harness = {
  app: ElectronApplication
  page: Page
  externalRequests: string[]
  close(): Promise<void>
}

async function launchHarness(persona: string, parameters = ''): Promise<Harness> {
  const { ELECTRON_RUN_AS_NODE: _ignored, ...safeEnvironment } = process.env
  const userData = await mkdtemp(join(tmpdir(), 'nexus-renderer-e2e-'))
  const query = new URLSearchParams({ persona })
  if (parameters) {
    const extras = new URLSearchParams(parameters)
    extras.forEach((value, key) => query.set(key, value))
  }
  const app = await electron.launch({
    args: [resolve('tests/fixtures/electron-renderer-harness.mjs')],
    env: {
      ...Object.fromEntries(Object.entries(safeEnvironment).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      NEXUS_RENDERER_FIXTURE_URL: `http://127.0.0.1:4173/tests/fixtures/renderer.html?${query.toString()}`,
      NEXUS_RENDERER_USER_DATA: userData
    }
  })
  const page = await app.firstWindow()
  await page.waitForURL('http://127.0.0.1:4173/**')
  const externalRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) externalRequests.push(url)
  })
  await expect(page.getByTestId('app')).toBeVisible({ timeout: 10_000 })
  return {
    app,
    page,
    externalRequests,
    async close() {
      await app.close()
      await rm(userData, { recursive: true, force: true })
    }
  }
}

test('novice BYOK invitation explains Council and local history', async () => {
  const harness = await launchHarness('novice')
  try {
    await expect(harness.page.getByRole('heading', { name: 'Start with a question.' })).toBeVisible()
    await expect(harness.page.getByLabel('Two model perspectives converge into one synthesis')).toBeVisible()
    const welcome = harness.page.getByLabel('Start with a question.')
    await expect(welcome.getByRole('button', { name: 'Connect providers' })).toBeVisible()
    await harness.page.getByText('Stored on this device').click()
    await expect(harness.page.getByText(/Work history and permissions stay local/)).toBeVisible()
    await welcome.getByRole('button', { name: 'Connect providers' }).click()
    await expect(harness.page.getByRole('heading', { name: 'Connections' })).toBeVisible()
    await expect(harness.page.getByText('What stays local', { exact: true })).toBeVisible()
    await expect(harness.page.getByText('01', { exact: true })).toHaveCount(0)
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('researcher configures and edits a guided workflow safely', async () => {
  const harness = await launchHarness('researcher')
  try {
    await harness.page.getByRole('button', { name: /Start with a workflow/ }).click()
    await expect(harness.page.getByRole('heading', { name: 'Choose a working method' })).toBeVisible()
    await expect(harness.page.getByRole('button', { name: /Council decision/ })).toBeVisible()
    await expect(harness.page.getByRole('button', { name: /Custom workflow/ })).toBeVisible()
    await harness.page.getByRole('button', { name: /Research brief/ }).click()
    await expect(harness.page.getByRole('textbox', { name: 'Message' })).toHaveValue(/Research question:/)
    await expect(harness.page.getByText('Two perspectives, one answer')).toBeVisible()
    expect(await harness.page.evaluate(() => (
      window as unknown as { __nexusMockCalls: Array<{ method: string }> }
    ).__nexusMockCalls.some((call) => call.method === 'createConversation'))).toBe(true)
    await expect(harness.page.getByRole('combobox', { name: 'Lead model' })).toHaveValue('gpt-5.6-sol')
    await expect(harness.page.getByRole('combobox', { name: 'Lead reasoning effort' })).toHaveValue('high')
    await expect(harness.page.getByText('1.05M context')).toBeVisible()
    await expect(harness.page.getByRole('combobox', { name: /Challenger model/ })).toHaveValue('claude-sonnet-5')
    await harness.page.getByRole('combobox', { name: 'Lead model' }).selectOption('claude-sonnet-5')
    await expect(harness.page.getByRole('combobox', { name: 'Challenger model' })).toHaveValue('gpt-5.6-sol')
    await harness.page.getByRole('combobox', { name: 'Lead model' }).selectOption('gpt-5.6-sol')
    await expect(harness.page.getByRole('combobox', { name: 'Challenger model' })).toHaveValue('claude-sonnet-5')
    await harness.page.getByRole('button', { name: 'Edit method' }).click()
    await harness.page.getByLabel('Workflow name').fill('Evidence review')
    await harness.page.getByRole('button', { name: 'Save method' }).click()
    await expect(harness.page.getByRole('heading', { name: 'Tune the working method' })).toHaveCount(0)
    await expect(harness.page.locator('.workflow-strip').getByText('Evidence review', { exact: true })).toBeVisible()
    const artifactDirectory = resolve('test-results/ux-artifacts')
    await mkdir(artifactDirectory, { recursive: true })
    await harness.page.screenshot({ path: resolve(artifactDirectory, 'council-workspace.png') })
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('power user choices persist and remain explainable', async () => {
  const harness = await launchHarness('developer')
  try {
    await harness.page.keyboard.press('ControlOrMeta+K')
    await harness.page.getByRole('button', { name: /Open workspace choices/ }).click()
    await harness.page.getByRole('button', { name: 'Compact' }).click()
    await harness.page.getByRole('radio', { name: 'Tidal' }).click()
    await harness.page.getByRole('button', { name: 'Context', exact: true }).click()
    await harness.page.getByRole('button', { name: 'Reduced' }).click()
    await harness.page.getByRole('button', { name: 'Explain my choices' }).click()
    await expect(harness.page.getByText(/because you selected it/)).toBeVisible()
    await expect(harness.page.getByTestId('app')).toHaveAttribute('data-density', 'compact')
    await expect(harness.page.getByTestId('app')).toHaveAttribute('data-accent', 'tidal')
    await harness.page.reload()
    await expect(harness.page.getByTestId('app')).toHaveAttribute('data-density', 'compact')
    await expect(harness.page.getByTestId('app')).toHaveAttribute('data-emphasis', 'context')
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('history can be pinned, archived, restored, and deleted', async () => {
  const harness = await launchHarness('developer')
  try {
    await test.step('pin conversation', async () => {
      await harness.page.getByRole('button', { name: 'Pin Existing local conversation' }).click()
      await expect(harness.page.getByRole('button', { name: 'Unpin Existing local conversation' })).toBeVisible()
    })
    await test.step('archive and restore conversation', async () => {
      await harness.page.getByRole('button', { name: 'Archive Existing local conversation' }).click()
      const archived = harness.page.locator('.archived-history > summary')
      await expect(archived).toBeVisible()
      await archived.click({ force: true })
      await expect(harness.page.getByRole('button', { name: 'Restore Existing local conversation' })).toBeVisible()
      await harness.page.getByRole('button', { name: 'Restore Existing local conversation' }).click()
    })
    await test.step('delete conversation', async () => {
      await harness.page.getByRole('button', { name: 'Delete Existing local conversation' }).click()
      await expect(harness.page.getByRole('heading', { name: 'Delete this conversation?' })).toBeVisible()
      await harness.page.getByRole('button', { name: 'Delete conversation' }).click()
      await expect(harness.page.getByText('Existing local conversation', { exact: true })).toHaveCount(0)
    })
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('a connected provider key can be replaced without removing it first', async () => {
  const harness = await launchHarness('researcher')
  try {
    await harness.page.getByRole('button', { name: 'Connections' }).click()
    const anthropic = harness.page.locator('.provider-card').filter({ hasText: 'Anthropic' })
    await anthropic.getByRole('button', { name: 'Replace key' }).click()
    await anthropic.getByLabel('anthropic API key').fill('sk-ant-replacement-key-that-is-long-enough')
    await anthropic.getByRole('button', { name: 'Verify & replace' }).click()
    await expect(anthropic.getByRole('button', { name: /Connected/ })).toBeVisible()
  } finally {
    await harness.close()
  }
})

test('Council stays unavailable until both providers have distinct models', async () => {
  const harness = await launchHarness('privacy')
  try {
    await harness.page.getByRole('button', { name: /Start with a workflow/ }).click()
    await harness.page.getByRole('button', { name: /Council decision/ }).click()
    await expect(harness.page.getByText('Connect OpenAI and Anthropic')).toBeVisible()
    await expect(harness.page.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('diagnostics are explicit and mocked without network', async () => {
  const harness = await launchHarness('developer')
  try {
    await harness.page.keyboard.press('ControlOrMeta+K')
    await harness.page.getByRole('button', { name: /Open self-test/ }).click()
    await expect(harness.page.getByRole('heading', { name: 'Workspace diagnostics' })).toBeVisible()
    await harness.page.getByRole('button', { name: 'Inspect mapping' }).click()
    await expect(harness.page.getByText(/2 models have explicit capability maps/)).toBeVisible()
    await harness.page.getByRole('button', { name: 'Request approval test' }).click()
    await expect(harness.page.getByText(/Approval completed/)).toBeVisible()
    await harness.page.getByRole('button', { name: 'Cancel running job' }).click()
    await expect(harness.page.getByText(/Cancellation requested/)).toBeVisible()
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('offline provider failure preserves the editable brief', async () => {
  const harness = await launchHarness('failing')
  try {
    await expect(harness.page.getByText('You are offline.')).toBeVisible()
    await harness.page.getByRole('button', { name: /Start with a workflow/ }).click()
    await harness.page.getByRole('button', { name: /Research brief/ }).click()
    const brief = harness.page.getByRole('textbox', { name: 'Message' })
    await brief.fill('Compare the local-first options.')
    await harness.page.getByRole('button', { name: 'Send' }).click()
    await expect(harness.page.getByRole('alert')).toContainText('Provider is unreachable')
    await expect(brief).toHaveValue('Compare the local-first options.')
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('loading state explains local workspace startup', async () => {
  const loading = await launchHarness('researcher', 'delay=900')
  try {
    await expect(loading.page.getByRole('status')).toContainText('Loading your conversations')
    await expect(loading.page.getByRole('heading', { name: 'Start with a question.' })).toBeVisible()
    expect(loading.externalRequests).toEqual([])
  } finally {
    await loading.close()
  }
})

test('local database errors provide a recovery action', async () => {
  const failing = await launchHarness('privacy', 'snapshotError=Local database is locked')
  try {
    await expect(failing.page.getByRole('alert')).toContainText('Local database is locked')
    await expect(failing.page.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(failing.externalRequests).toEqual([])
  } finally {
    await failing.close()
  }
})

test('landmarks and keyboard focus remain accessible', async () => {
  const harness = await launchHarness('accessibility')
  try {
    await expect(harness.page.getByRole('navigation', { name: 'Local work history' })).toBeVisible()
    await expect(harness.page.getByRole('main', { name: 'Council workspace' })).toBeVisible()
    await harness.page.getByRole('button', { name: 'Show context inspector' }).click()
    await expect(harness.page.getByRole('complementary', { name: 'Context inspector' })).toBeVisible()
    await harness.page.keyboard.press('Meta+k')
    await expect(harness.page.getByRole('dialog', { name: 'Command menu' })).toBeVisible()
    await expect(harness.page.getByPlaceholder('Find a workspace action…')).toBeFocused()
    await harness.page.keyboard.press('Escape')
    await harness.page.keyboard.press('Meta+n')
    await expect(harness.page.getByRole('dialog', { name: 'Workflow library' })).toBeVisible()
    await harness.page.keyboard.press('Escape')
    await expect(harness.page.getByRole('dialog', { name: 'Workflow library' })).toHaveCount(0)
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

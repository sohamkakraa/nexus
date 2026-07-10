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
    await expect(harness.page.getByRole('heading', { name: 'Set the table.' })).toBeVisible()
    await expect(harness.page.getByLabel('Two model perspectives converge into one synthesis')).toBeVisible()
    await expect(harness.page.getByRole('button', { name: 'Connect models' })).toBeVisible()
    await harness.page.getByText('Stored on this Mac').click()
    await expect(harness.page.getByText(/Work history and permissions stay local/)).toBeVisible()
    await harness.page.getByRole('button', { name: 'Connect models' }).click()
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
    await harness.page.getByRole('button', { name: /Choose a workflow/ }).click()
    await expect(harness.page.getByRole('heading', { name: 'Choose a working method' })).toBeVisible()
    await expect(harness.page.getByRole('button', { name: /Council decision/ })).toBeVisible()
    await expect(harness.page.getByRole('button', { name: /Custom workflow/ })).toBeVisible()
    await harness.page.getByRole('button', { name: /Research brief/ }).click()
    await expect(harness.page.getByRole('textbox', { name: 'Working brief' })).toHaveValue(/Research question:/)
    await expect(harness.page.getByText('Two models → one synthesis')).toBeVisible()
    await expect(harness.page.getByRole('combobox', { name: /Challenger/ })).toHaveValue('claude-opus-4-5')
    await harness.page.getByRole('button', { name: 'Edit method' }).click()
    await harness.page.getByLabel('Workflow name').fill('Evidence review')
    await harness.page.getByRole('button', { name: 'Save method' }).click()
    await expect(harness.page.locator('.workflow-strip').getByText('Evidence review', { exact: true })).toBeVisible()
    const artifactDirectory = resolve('test-results/ux-artifacts')
    await mkdir(artifactDirectory, { recursive: true })
    await harness.page.screenshot({ path: resolve(artifactDirectory, 'council-workspace.png') })
    expect(harness.externalRequests).toEqual([])
  } finally {
    await harness.close()
  }
})

test('power user choices persist and explain adaptation', async () => {
  const harness = await launchHarness('developer')
  try {
    await harness.page.getByRole('button', { name: 'Workspace choices' }).click()
    await harness.page.getByRole('button', { name: 'Compact' }).click()
    await harness.page.getByRole('radio', { name: 'Tidal' }).click()
    await harness.page.getByRole('button', { name: 'Context', exact: true }).click()
    await harness.page.getByRole('button', { name: 'Reduced' }).click()
    await harness.page.getByRole('button', { name: 'Why this changed' }).click()
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

test('diagnostics are explicit and mocked without network', async () => {
  const harness = await launchHarness('developer')
  try {
    await harness.page.getByRole('button', { name: 'Self-test' }).click()
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
    await harness.page.getByRole('button', { name: /Choose a workflow/ }).click()
    await harness.page.getByRole('button', { name: /Research brief/ }).click()
    const brief = harness.page.getByRole('textbox', { name: 'Working brief' })
    await brief.fill('Compare the local-first options.')
    await harness.page.getByRole('button', { name: /Send brief/ }).click()
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
    await expect(loading.page.getByRole('status')).toContainText('Setting the table')
    await expect(loading.page.getByRole('heading', { name: 'Set the table.' })).toBeVisible()
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
    await expect(harness.page.getByRole('navigation', { name: 'Workspace views' })).toBeVisible()
    await expect(harness.page.getByRole('main', { name: 'Council workspace' })).toBeVisible()
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

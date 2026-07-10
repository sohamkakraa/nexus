import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

const assetUrl = 'https://github.com/sohamkakraa/nexus/releases/download/v1.2.3/Nexus-1.2.3-mac-arm64.dmg'

test('confident match immediately downloads the selected asset', async ({ browser }) => {
  const context = await contextFor(browser, {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)',
    hints: { platform: 'macOS', architecture: 'arm', bitness: '64' }
  })
  try {
    const page = await context.newPage()
    await mockManifest(page, stableManifest())
    await page.route(assetUrl, (route) => route.fulfill({
      status: 200,
      body: 'intercepted test artifact',
      headers: {
        'content-disposition': 'attachment; filename="Nexus-1.2.3-mac-arm64.dmg"',
        'content-type': 'application/octet-stream'
      }
    }))
    await page.goto('/download')

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('primary-download').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('Nexus-1.2.3-mac-arm64.dmg')
  } finally {
    await context.close()
  }
})

test('ambiguous macOS architecture requires a chooser', async ({ browser }) => {
  const context = await contextFor(browser, {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15'
  })
  try {
    const page = await context.newPage()
    await mockManifest(page, stableManifest())
    await page.goto('/download')

    await expect(page.getByTestId('architecture-chooser')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apple Silicon / ARM64' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Intel / AMD x64' })).toBeVisible()
    await expect(page.getByTestId('primary-download')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('unsupported platform routes to the manual fallback', async ({ browser }) => {
  const context = await contextFor(browser, {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
  })
  try {
    const page = await context.newPage()
    await mockManifest(page, stableManifest())
    await page.goto('/download')

    await expect(page.getByRole('heading', { name: 'Desktop build unavailable for this device.' })).toBeVisible()
    await expect(page.getByTestId('release-fallback')).toHaveText('View other platforms')
  } finally {
    await context.close()
  }
})

test('missing stable release never invents an installer URL', async ({ browser }) => {
  const context = await contextFor(browser, {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    hints: { platform: 'Windows', architecture: 'x86', bitness: '64' }
  })
  try {
    const page = await context.newPage()
    await mockManifest(page, {
      schemaVersion: 1,
      generatedAt: '2026-07-10T12:00:00.000Z',
      fallbackUrl: 'https://github.com/sohamkakraa/nexus/releases',
      release: null
    })
    await page.goto('/download')

    await expect(page.getByTestId('no-release-state')).toContainText('No compatible stable artifacts')
    await expect(page.getByTestId('release-fallback')).toHaveText('View release status')
    await expect(page.getByTestId('primary-download')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

async function contextFor(
  browser: Browser,
  fixture: {
    userAgent: string
    hints?: { platform: string; architecture: string; bitness: string }
  }
): Promise<BrowserContext> {
  const context = await browser.newContext({ userAgent: fixture.userAgent, acceptDownloads: true })
  await context.addInitScript((hints) => {
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: hints
        ? {
            platform: hints.platform,
            getHighEntropyValues: async () => ({ ...hints, wow64: false })
          }
        : undefined
    })
  }, fixture.hints)
  return context
}

async function mockManifest(page: Page, manifest: unknown): Promise<void> {
  await page.route('**/release-manifest.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(manifest)
  }))
}

function stableManifest(): unknown {
  return {
    schemaVersion: 1,
    generatedAt: '2026-07-10T12:00:00.000Z',
    fallbackUrl: 'https://github.com/sohamkakraa/nexus/releases',
    release: {
      version: '1.2.3',
      channel: 'stable',
      publishedAt: '2026-07-10T12:00:00.000Z',
      releaseUrl: 'https://github.com/sohamkakraa/nexus/releases/tag/v1.2.3',
      checksumsUrl: 'https://github.com/sohamkakraa/nexus/releases/download/v1.2.3/SHA256SUMS.txt',
      assets: [
        fixtureAsset('arm64', 'dmg', 'Nexus-1.2.3-mac-arm64.dmg', assetUrl),
        fixtureAsset(
          'x64',
          'dmg',
          'Nexus-1.2.3-mac-x64.dmg',
          'https://github.com/sohamkakraa/nexus/releases/download/v1.2.3/Nexus-1.2.3-mac-x64.dmg'
        )
      ]
    }
  }
}

function fixtureAsset(architecture: 'arm64' | 'x64', format: 'dmg', fileName: string, url: string): unknown {
  return {
    platform: 'macos',
    architecture,
    format,
    fileName,
    url,
    sizeBytes: 100_000_000,
    sha256: 'a'.repeat(64),
    systemRequirements: 'macOS 14 or later',
    installInstructions: ['Open the DMG.', 'Drag Nexus to Applications.'],
    signing: { status: 'notarized', label: 'Developer ID signed and Apple notarized' }
  }
}

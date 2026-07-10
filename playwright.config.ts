import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/tests/fixtures/renderer.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
})

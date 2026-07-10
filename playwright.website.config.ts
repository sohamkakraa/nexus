import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './website/tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm --prefix website run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/download',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})

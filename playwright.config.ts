import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/frontends/electron/e2e',
  fullyParallel: false, // Electron tests run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Only 1 worker for Electron tests
  reporter: [['list'], ['html']],
  timeout: 30000,

  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
      use: {
        launchArgs: process.env.CI ? ['--no-sandbox'] : [],
      },
    },
  ],
})

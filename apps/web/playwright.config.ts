import { defineConfig, devices } from '@playwright/test';

// E2E flows (§45, Flows A-D) land with Frontend/QA once routes exist beyond the hello page.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Unbounded workers saturate a laptop once the suite passes ~16 specs: pages then time out
  // "while setting up", which reads as a product failure and is not one. Two is enough
  // concurrency to keep the suite quick while staying deterministic on CI runners too.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'task-manager',
      testMatch: 'task-manager.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
      },
    },
    {
      name: 'multi-ns-app',
      testMatch: 'multi-ns-app.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4174',
      },
    },
  ],
  webServer: [
    {
      command: 'cd ../../examples/task-manager && npm install && npm run build && npm run preview -- --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../../examples/multi-ns-app && npm install && npm run build && npm run preview -- --port 4174',
      port: 4174,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

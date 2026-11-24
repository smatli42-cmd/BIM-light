import { defineConfig, devices } from '@playwright/test';

// Testy běží proti sestavené stránce (vite preview), stejně jako na GitHub Pages.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4317/BIM-light/' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    cwd: '.',
    url: 'http://localhost:4317/BIM-light/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

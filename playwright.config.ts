import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL },
  projects: [375, 768, 1440].map((width) => ({
    name: `w${width}`,
    use: { browserName: 'chromium', viewport: { width, height: 900 } },
  })),
  // Serves dist/ unless a server is already listening (CI starts its own on the same URL).
  webServer: {
    command: 'node scripts/serve.mjs dist 4173',
    url: baseURL,
    reuseExistingServer: true,
  },
});

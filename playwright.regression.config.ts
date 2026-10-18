import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4175';

// Site-wide regression suite against the served dist/ (npm run test:regression builds dist/ first when it is missing).
export default defineConfig({
  testDir: 'tests/regression',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL },
  projects: [
    ...[375, 768, 1440].map((width) => ({
      name: `w${width}`,
      testMatch: 'pages.spec.ts',
      use: { browserName: 'chromium' as const, viewport: { width, height: 900 } },
    })),
    {
      name: 'site',
      testMatch: ['site.spec.ts', 'fixtures.spec.ts'],
      use: { browserName: 'chromium' as const, viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'node scripts/serve.mjs dist 4175',
    url: baseURL,
    reuseExistingServer: false,
  },
});

import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174';

// Component tests run against dist-fixture/ (npm run build:fixture), which is never deployed.
export default defineConfig({
  testDir: 'tests/fixture',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL },
  projects: [375, 768, 1440].map((width) => ({
    name: `w${width}`,
    use: { browserName: 'chromium', viewport: { width, height: 900 } },
  })),
  webServer: {
    command: 'node scripts/serve.mjs dist-fixture 4174',
    url: `${baseURL}/fixture/components`,
    reuseExistingServer: true,
  },
});

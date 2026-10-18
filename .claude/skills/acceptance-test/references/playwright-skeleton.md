# Playwright skeleton

A minimal setup for `tests/e2e/`. Adapt names to the repo; do not add dependencies the repo does not already have without asking.

```bash
npm i -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts` (keep to the viewports the ticket names):

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  retries: 0,                       // a flaky pass is reported as unstable, not hidden by retries
  use: { baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4321', screenshot: 'on' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 800 } } },
  ],
});
```

`tests/e2e/acceptance.spec.ts`: one test per criterion, id first in the name.

```ts
import { test, expect } from '@playwright/test';

test('AC1 home has one primary call to action named for its outcome', async ({ page }) => {
  await page.goto('/');
  const primary = page.getByRole('link', { name: /get the install command/i });
  await expect(primary).toHaveCount(1);
});

test('AC2 no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('AC3 touch targets are at least 44 px high', async ({ page }) => {
  await page.goto('/');
  for (const el of await page.getByRole('link').all()) {
    const box = await el.boundingBox();
    if (box && (await el.isVisible())) expect(box.height, await el.innerText()).toBeGreaterThanOrEqual(44);
  }
});
```

Run: `BASE_URL=<preview url> npx playwright test --reporter=list`. The report lists each test by criterion id; attach the screenshots from `test-results/`.

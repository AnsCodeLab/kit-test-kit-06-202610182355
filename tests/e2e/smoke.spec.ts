import { test, expect } from '@playwright/test';

test('/ responds 200 with lang, title, one h1 and one main', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await page.title()).trim()).not.toBe('');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
});

test('internal links on every skill page return 200', async ({ page, request }) => {
  const { builtPages } = await import('../../scripts/pages.mjs');
  const checked = new Map<string, number>();
  for (const route of builtPages().filter((r) => r.startsWith('/product/skills/'))) {
    await page.goto(route);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));
    for (const href of hrefs) {
      if (checked.has(href)) continue;
      checked.set(href, (await request.get(href)).status());
    }
  }
  expect(checked.size).toBeGreaterThan(50);
  expect([...checked].filter(([, status]) => status !== 200)).toEqual([]);
});

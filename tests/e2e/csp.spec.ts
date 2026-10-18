import { test, expect } from '@playwright/test';
import { startHeadersServer } from '../helpers/headers-server.mjs';

// Serves dist/ with the rules of dist/_headers applied and loads every built page under the real CSP.
let server: Awaited<ReturnType<typeof startHeadersServer>>;
test.beforeAll(async () => {
  server = await startHeadersServer('dist');
});
test.afterAll(async () => server.close());

test('every built page loads with 0 CSP violations', async ({ page }) => {
  test.setTimeout(120_000);
  const { builtPages } = await import('../../scripts/pages.mjs');
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || /content security policy/i.test(m.text())) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  const pages = builtPages();
  expect(pages.length).toBeGreaterThan(50);
  for (const route of pages) {
    const response = await page.goto(server.url + route, { waitUntil: 'load' });
    expect(response?.headers()['content-security-policy'], route).toContain("default-src 'self'");
  }
  expect(problems).toEqual([]);
});

test('the copy button still works under the CSP', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url });
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  await page.goto(server.url + '/');
  const block = page.locator('[data-install]').first();
  const button = block.getByRole('button');
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveText('Copied');
  const expected = (await block.locator('code').textContent())!.trim();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  expect(problems).toEqual([]);
});

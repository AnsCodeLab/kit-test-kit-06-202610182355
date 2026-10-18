import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const COMMAND = 'npx @anscodelab/coding-agent-kit';
const routes = ['/docs/', '/docs/quickstart/'];

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

for (const route of routes) {
  test(`${route}: 200, one h1, unique title, main landmark, skip link`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('a.skip-link[href="#main"]')).toHaveCount(1);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
  });
}

test('titles differ between the index and the quickstart', async ({ page }) => {
  await page.goto('/docs/');
  const a = await page.title();
  await page.goto('/docs/quickstart/');
  expect(await page.title()).not.toBe(a);
});

test('index links to the quickstart using the handbook title', async ({ page }) => {
  await page.goto('/docs/');
  const link = page.locator('[data-doc-pages] a');
  await expect(link).toHaveAttribute('href', '/docs/quickstart/');
  const text = (await link.textContent())!.trim();
  await page.goto('/docs/quickstart/');
  await expect(page.locator('h1')).toHaveText(text);
});

test('quickstart: install command with a working copy button', async ({ page }) => {
  await page.goto('/docs/quickstart/');
  await expect(page.locator('[data-install] code')).toHaveText(COMMAND);
  const button = page.locator('[data-install] button');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('[data-status]')).not.toBeEmpty();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMMAND);
});

test('quickstart: ids unique, in-page navigation resolves, anchors work', async ({ page }) => {
  await page.goto('/docs/quickstart/');
  const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  const idSet = new Set(ids);
  const hrefs = await page.locator('main a[href^="#"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!.slice(1)));
  expect(hrefs.length).toBeGreaterThan(5);
  for (const h of hrefs) expect(idSet.has(h), h).toBe(true);
  const headings = await page.locator('main h2, main h3, main h4').count();
  const toc = await page.locator('nav[aria-label="On this page"] a').count();
  expect(toc).toBe(headings);
  for (const h of await page.locator('.prose h2, .prose h3').all()) await expect(h).toHaveAttribute('id', /.+/);
});

test('quickstart: no horizontal page scroll, no clipped text, scrolling blocks are focusable', async ({ page }) => {
  await page.goto('/docs/quickstart/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const clipped = await page.locator('main *').evaluateAll((els) =>
    els.filter((e) => {
      const cs = getComputedStyle(e);
      if (e.scrollWidth <= e.clientWidth + 1) return false;
      if (['auto', 'scroll'].includes(cs.overflowX)) return !e.matches('[tabindex="0"]');
      return e.clientWidth > 0 && cs.overflowX === 'hidden';
    }).length,
  );
  expect(clipped).toBe(0);
  const blocks = page.locator('.prose .scroll');
  expect(await blocks.count()).toBeGreaterThan(5);
  const first = blocks.first();
  await first.focus();
  await expect(first).toBeFocused();
  const outline = await first.evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(outline).not.toBe('none');
});

test('quickstart: long lines scroll inside the code block', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/docs/quickstart/');
  const scrolls = await page.locator('.prose .scroll').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
  expect(scrolls).toBeGreaterThan(0);
});

for (const route of routes) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

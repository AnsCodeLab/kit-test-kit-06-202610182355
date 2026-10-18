import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
const noticeFiles = fs.readdirSync('content/catalog-data/skills').filter((f) => /^NOTICE-.*\.md$/.test(f));
const titles = new Map<string, string>();

for (const route of ['/license/', '/third-party/']) {
  test(`${route}: 200, one h1, unique title, footer links to both pages`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    titles.set(route, title);
    for (const other of ['/', '/product/', '/about/', '/offer/', '/docs/']) {
      await page.goto(other);
      expect(await page.title()).not.toBe(title);
    }
    await page.goto(route);
    await expect(page.locator('footer a[href="/license/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/third-party/"]')).toHaveCount(1);
  });
}

test('footer links appear on other pages too', async ({ page }) => {
  for (const route of ['/', '/product/', '/docs/', '/about/']) {
    await page.goto(route);
    await expect(page.locator('footer a[href="/license/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/third-party/"]')).toHaveCount(1);
  }
});

test('license page holds the full LICENSE text', async ({ page }) => {
  await page.goto('/license/');
  const text = await page.locator('main').innerText();
  expect(flat(text)).toContain(flat(fs.readFileSync('content/LICENSE', 'utf8')));
});

test('third-party page: THIRD-PARTY.md text and one section per notice file', async ({ page }) => {
  await page.goto('/third-party/');
  expect(noticeFiles).toHaveLength(7);
  await expect(page.locator('[data-notice]')).toHaveCount(noticeFiles.length);
  const body = flat(await page.locator('[data-notice] >> nth=0').innerText());
  expect(body.length).toBeGreaterThan(50);
  for (const f of noticeFiles) {
    const section = page.locator(`[data-notice]:has(h2:text-is("${f}"))`);
    await expect(section).toHaveCount(1);
    const shown = flat(await section.locator('pre').innerText());
    expect(shown).toBe(flat(fs.readFileSync(`content/catalog-data/skills/${f}`, 'utf8')));
  }
  const intro = flat(await page.locator('[data-third-party]').innerText());
  expect(intro).toContain('Vendored content keeps its upstream MIT license.');
  expect(intro).toContain('All other catalog skills, templates and code are original to this project');
});

test('contents links resolve to existing heading ids', async ({ page }) => {
  await page.goto('/third-party/');
  const links = page.locator('[data-toc] a');
  expect(await links.count()).toBe(noticeFiles.length + 1);
  for (const a of await links.all()) {
    const href = (await a.getAttribute('href'))!;
    expect(href).toMatch(/^#/);
    const id = href.slice(1);
    await expect(page.locator(`h2[id="${id}"]`)).toHaveCount(1);
  }
});

for (const route of ['/license/', '/third-party/']) {
  for (const w of [375, 768, 1440]) {
    test(`${route} has no horizontal scroll at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const wide = await page.locator('main pre').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
      expect(wide).toBe(0);
    });
  }
}

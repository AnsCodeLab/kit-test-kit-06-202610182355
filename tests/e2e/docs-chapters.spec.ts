import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const chapters = fs
  .readdirSync('content/handbook')
  .filter((f) => /^\d{2}-.+\.md$/.test(f))
  .sort()
  .map((f) => ({
    file: f,
    slug: f.replace(/^\d{2}-/, '').replace(/\.md$/, ''),
    h1: /^# (.+)$/m.exec(fs.readFileSync(`content/handbook/${f}`, 'utf8').replace(/^```[\s\S]*?^```/gm, ''))![1].trim(),
  }));
const routes = ['/docs/', ...chapters.map((c) => `/docs/${c.slug}/`)];

test('there are 9 chapters', () => {
  expect(chapters).toHaveLength(9);
});

test('index lists all chapters with their handbook titles, in order', async ({ page }) => {
  await page.goto('/docs/');
  const links = page.locator('[data-doc-pages] a');
  await expect(links).toHaveCount(9);
  expect(await links.allTextContents()).toEqual(chapters.map((c) => c.h1));
  expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(chapters.map((c) => `/docs/${c.slug}/`));
});

for (const c of chapters) {
  test(`/docs/${c.slug}/: 200, h1 equals the chapter heading, pager follows chapter order`, async ({ page }) => {
    const res = await page.goto(`/docs/${c.slug}/`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(c.h1);
    const i = chapters.indexOf(c);
    const prev = page.locator('.pager a[rel="prev"]');
    const next = page.locator('.pager a[rel="next"]');
    if (i === 0) await expect(prev).toHaveCount(0);
    else {
      await expect(prev).toHaveAttribute('href', `/docs/${chapters[i - 1].slug}/`);
      await expect(prev).toContainText(chapters[i - 1].h1);
    }
    if (i === chapters.length - 1) await expect(next).toHaveCount(0);
    else {
      await expect(next).toHaveAttribute('href', `/docs/${chapters[i + 1].slug}/`);
      await expect(next).toContainText(chapters[i + 1].h1);
    }
  });
}

test('every internal link on every docs page returns 200', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const route of routes) {
    await page.goto(route);
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== new URL(page.url()).origin) continue;
      seen.add(url.pathname);
    }
  }
  expect(seen.size).toBeGreaterThan(9);
  for (const p of seen) {
    expect((await request.get(p)).status(), p).toBe(200);
  }
});

for (const c of chapters) {
  test(`/docs/${c.slug}/: no horizontal page scroll, scroll blocks focusable`, async ({ page }) => {
    await page.goto(`/docs/${c.slug}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const unfocusable = await page.locator('main *').evaluateAll((els) =>
      els.filter((e) => {
        const cs = getComputedStyle(e);
        return ['auto', 'scroll'].includes(cs.overflowX) && e.scrollWidth > e.clientWidth + 1 && !e.matches('[tabindex="0"]');
      }).length,
    );
    expect(unfocusable).toBe(0);
  });
}

for (const route of routes) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

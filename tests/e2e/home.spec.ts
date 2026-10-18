import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { parse } from 'yaml';

const COMMAND = 'npx @anscodelab/coding-agent-kit';
const skills = parse(fs.readFileSync('content/catalog-data/skills.yaml', 'utf8')) as { group: string }[];
const expected = new Map<string, number>();
for (const s of skills) expected.set(s.group, (expected.get(s.group) ?? 0) + 1);

test('head: unique title, description, one h1, ordered headings, one main', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await page.title()).length).toBeGreaterThan(10);
  expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
  expect(levels[0]).toBe(1);
  levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
});

test('skill group counts match skills.yaml and sum to its entry count', async ({ page }) => {
  await page.goto('/');
  const shown = await page.locator('[data-skill-group]').evaluateAll((els) =>
    els.map((e) => [e.getAttribute('data-skill-group'), Number(e.querySelector('.count')?.textContent)] as const),
  );
  expect(new Map(shown)).toEqual(expected);
  expect(Number(await page.locator('[data-skill-total]').textContent())).toBe(skills.length);
});

for (const vp of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`command, copy button and file tree within two viewports at ${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    for (const loc of [page.locator('[data-install] code'), page.locator('[data-install] button'), page.locator('dl.tree')]) {
      const box = (await loc.boundingBox())!;
      expect(box.y).toBeLessThan(vp.height * 2);
    }
    await expect(page.locator('[data-install] code')).toHaveText(COMMAND);
  });
}

for (const w of [375, 768, 1440]) {
  test(`no horizontal scroll and 44 px targets at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const small = await page.locator('main a, main button').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length,
    );
    expect(small).toBe(0);
  });
}

test('links work and text has no currency, percentage or proof words', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')!))]);
  for (const h of hrefs) expect((await request.get(h)).status()).toBe(200);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/[$€£¥%]/);
  expect(text).not.toMatch(/testimonial|customers?|rated|rating/i);
  for (const img of await page.locator('img').all()) expect(await img.getAttribute('alt')).not.toBeNull();
});

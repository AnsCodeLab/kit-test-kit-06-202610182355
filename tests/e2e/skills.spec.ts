import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { parse } from 'yaml';

const skills = parse(fs.readFileSync('content/catalog-data/skills.yaml', 'utf8')) as {
  id: string;
  name: string;
  group: string;
  description: string;
}[];
const bodySize = (id: string) => fs.statSync(`content/catalog-data/skills/${id}/SKILL.md`).size;
const longest = [...skills].sort((a, b) => bodySize(b.id) - bodySize(a.id))[0];
const sample = [
  ...new Map(skills.map((s) => [s.group, s])).values(),
  longest,
].filter((s, i, all) => all.indexOf(s) === i);

test('one built page per skill id', () => {
  const dirs = fs.readdirSync('dist/product/skills').filter((d) => fs.existsSync(`dist/product/skills/${d}/index.html`));
  expect(dirs.sort()).toEqual(skills.map((s) => s.id).sort());
});

for (const s of skills) {
  test(`skill page ${s.id}: 200, h1, title, description, back link`, async ({ page }) => {
    const res = await page.goto(`/product/skills/${s.id}/`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(s.name);
    expect(await page.title()).toContain(s.name);
    const shown = await page.locator('[data-description]').innerText();
    expect(shown.replace(/\s+/g, ' ').trim()).toBe(s.description.replace(/\s+/g, ' ').trim());
    await expect(page.locator('main a[href="/product/"]')).toHaveCount(1);
  });
}

test('neighbour links stay inside the group in yaml order', async ({ page }) => {
  const byGroup = Map.groupBy(skills, (s) => s.group);
  const group = [...byGroup.values()].find((g) => g.length >= 3)!;
  await page.goto(`/product/skills/${group[1].id}/`);
  await expect(page.locator('a[rel=prev]')).toHaveAttribute('href', `/product/skills/${group[0].id}/`);
  await expect(page.locator('a[rel=next]')).toHaveAttribute('href', `/product/skills/${group[2].id}/`);
  await page.goto(`/product/skills/${group[0].id}/`);
  await expect(page.locator('a[rel=prev]')).toHaveCount(0);
});

test('Product page links every skill to its page', async ({ page }) => {
  await page.goto('/product/');
  const hrefs = await page.locator('[data-skill] a.name').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.sort()).toEqual(skills.map((s) => `/product/skills/${s.id}/`).sort());
});

test('no horizontal page scroll at 375 on any skill page; scrolling blocks are focusable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const s of skills) {
    await page.goto(`/product/skills/${s.id}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), s.id).toBe(true);
    const bad = await page.locator('main *').evaluateAll((els) =>
      els
        .filter((e) => e.scrollWidth > e.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowX))
        .filter((e) => !e.matches('[tabindex="0"]')).length,
    );
    expect(bad, s.id).toBe(0);
    const small = await page.locator('main a:not(.prose a)').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length,
    );
    expect(small, s.id).toBe(0);
  }
});

for (const w of [375, 1440]) {
  for (const s of sample) {
    test(`axe: ${s.id} at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`/product/skills/${s.id}/`);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations).toEqual([]);
    });
  }
}

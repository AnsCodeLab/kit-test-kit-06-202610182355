import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { parse } from 'yaml';

const load = <T>(file: string) => parse(fs.readFileSync(`content/catalog-data/${file}`, 'utf8')) as T[];
const skills = load<{ id: string; name: string; group: string; description: string }>('skills.yaml');
const expected = new Map<string, number>();
for (const s of skills) expected.set(s.group, (expected.get(s.group) ?? 0) + 1);
const lists = {
  hooks: load<{ id: string }>('hooks.yaml'),
  mcp: load<{ id: string }>('mcp.yaml'),
  agents: load<{ id: string }>('agents.yaml'),
  ides: load<{ id: string }>('ides.yaml'),
};

test('head: 200, unique title, description, one h1, one h2 per skill group', async ({ page }) => {
  const res = await page.goto('/product/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  const title = await page.title();
  expect(title.length).toBeGreaterThan(10);
  expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
  const description = await page.locator('meta[name=description]').getAttribute('content');
  for (const other of ['/', '/docs/', '/offer/', '/about/']) {
    await page.goto(other);
    expect(await page.title()).not.toBe(title);
    const others = await page.locator('meta[name=description]').evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    expect(others).not.toContain(description);
  }
  await page.goto('/product/');
  for (const group of expected.keys()) {
    await expect(page.locator(`section[data-skill-group="${group}"] h2`)).toHaveCount(1);
  }
  await expect(page.locator('section[data-skill-group]')).toHaveCount(expected.size);
});

test('group counts match skills.yaml, sum to the total, and each skill appears once', async ({ page }) => {
  await page.goto('/product/');
  const shown = await page.locator('section[data-skill-group]').evaluateAll((els) =>
    els.map(
      (e) =>
        [
          e.getAttribute('data-skill-group'),
          Number(e.querySelector('[data-group-count]')?.textContent),
          e.querySelectorAll('[data-skill]').length,
        ] as const,
    ),
  );
  expect(new Map(shown.map(([g, c]) => [g, c]))).toEqual(expected);
  expect(new Map(shown.map(([g, , rows]) => [g, rows]))).toEqual(expected);
  expect(shown.reduce((sum, [, c]) => sum + c, 0)).toBe(skills.length);
  const ids = await page.locator('[data-skill]').evaluateAll((els) => els.map((e) => e.getAttribute('data-skill')));
  expect([...ids].sort()).toEqual(skills.map((s) => s.id).sort());
  const names = await page.locator('[data-skill] .name').allInnerTexts();
  expect([...names].sort()).toEqual(skills.map((s) => s.name).sort());
});

test('each skill row has a non-empty one-line purpose', async ({ page }) => {
  await page.goto('/product/');
  const rows = await page.locator('[data-skill]').evaluateAll((els) =>
    els.map((e) => [e.getAttribute('data-skill'), e.querySelector('.purpose')?.textContent?.trim() ?? ''] as const),
  );
  expect(rows).toHaveLength(skills.length);
  for (const [id, text] of rows) {
    const description = skills.find((s) => s.id === id)!.description.replace(/\s+/g, ' ').trim();
    expect(text.length, id!).toBeGreaterThan(0);
    expect(description.startsWith(text), id!).toBe(true);
  }
});

test('hooks, MCP servers, agents and IDE support list exactly the yaml ids', async ({ page }) => {
  await page.goto('/product/');
  for (const [key, items] of Object.entries(lists)) {
    const ids = await page.locator(`[data-list="${key}"] [data-id]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
    expect(ids, key).toEqual(items.map((i) => i.id));
  }
});

for (const w of [375, 768, 1440]) {
  test(`no horizontal scroll, no clipped text and 44 px targets at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/product/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const clipped = await page.locator('main *').evaluateAll(
      (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline').length,
    );
    expect(clipped).toBe(0);
    const small = await page.locator('main a, main button').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length,
    );
    expect(small).toBe(0);
  });
}

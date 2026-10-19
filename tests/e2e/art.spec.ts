import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

// KRK06-24: the illustration layer. Checks the built HTML (counts, size, hosts, CSP-safe) and the rendered pages
// (accessibility roles, no overflow, reduced motion).
const PAGES = ['/', '/product/', '/docs/', '/offer/', '/about/'];
const file = (route: string) => `dist${route}index.html`;
const svgs = (html: string) => [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]);

const headArt = (route: string) => [...fs.readFileSync(file(route), 'utf8').matchAll(/<(?:figure|div) class="art-fig[^"]*"[^>]*>([\s\S]*?<\/svg>)/g)].map((m) => svgs(m[1])[0]);

test('home plus the four pages contain at least 6 distinct inline SVG visuals', () => {
  const heads = ['/product/', '/docs/', '/offer/', '/about/'].flatMap(headArt);
  expect(heads).toHaveLength(4);
  const all = [...heads, ...PAGES.flatMap((p) => svgs(fs.readFileSync(file(p), 'utf8')))];
  expect(new Set(all).size).toBeGreaterThanOrEqual(6);
});

test('each page header visual differs from the others', () => {
  const heads = ['/product/', '/docs/', '/offer/', '/about/'].map((p) => headArt(p)[0]);
  expect(heads.every(Boolean)).toBe(true);
  expect(new Set(heads).size).toBe(4);
});

test('the four group illustrations on Product are different drawings', () => {
  const html = fs.readFileSync(file('/product/'), 'utf8');
  const groups = svgs(html).filter((s) => s.includes('art-group'));
  expect(groups).toHaveLength(4);
  expect(new Set(groups).size).toBe(4);
  // Different shape language: compare the multiset of element names.
  const shape = (s: string) => [...s.matchAll(/<(circle|rect|path|line)\b/g)].map((m) => m[1]).sort().join(',');
  expect(new Set(groups.map(shape)).size).toBe(4);
});

test('no third-party host, no inline style attribute, no raster image, under 30 KB of SVG per page', () => {
  for (const route of PAGES) {
    const html = fs.readFileSync(file(route), 'utf8');
    const inline = svgs(html);
    expect(inline.join('').length, route).toBeLessThan(30 * 1024);
    for (const s of inline) {
      expect(s, route).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
      expect(s, route).not.toMatch(/\sstyle=/);
      expect(s, route).not.toMatch(/<image\b/);
    }
    expect(html, route).not.toMatch(/\sstyle="/);
  }
});

async function roles(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('main svg')].map((s) => ({
      hidden: s.getAttribute('aria-hidden') === 'true',
      img: s.getAttribute('role') === 'img',
      title: s.querySelector('title')?.textContent ?? '',
      desc: s.querySelector('desc')?.textContent ?? '',
      labelled: !!s.getAttribute('aria-labelledby') && !!document.getElementById(s.getAttribute('aria-labelledby')!),
      focusable: s.getAttribute('focusable'),
    })),
  );
}

for (const route of PAGES) {
  test(`${route}: decorative SVGs are hidden, informative ones are named`, async ({ page }) => {
    await page.goto(route);
    const list = await roles(page);
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) {
      expect(s.hidden || s.img).toBe(true);
      if (s.hidden) expect(s.title).toBe('');
      if (s.img) {
        expect(s.labelled).toBe(true);
        expect(s.title.length).toBeGreaterThan(3);
        expect(s.desc.length).toBeGreaterThan(20);
      }
      expect(s.focusable).toBe('false');
    }
  });

  test(`${route}: art causes no horizontal scroll and no layout shift`, async ({ page }) => {
    // Only shifts that move or resize the art count here; other components have their own checks.
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources: { node?: Node }[] }[]) {
          const touchesArt = e.sources.some((s) => {
            const el = s.node instanceof Element ? s.node : s.node?.parentElement;
            return !!el?.closest('svg.art, .art-fig, .art-head, .group-head, [data-skill-groups] li');
          });
          if (!e.hadRecentInput && touchesArt) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(route);
    await page.waitForLoadState('load');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.01);
  });
}

test('product illustration areas follow the real skill counts', async ({ page }) => {
  await page.goto('/product/');
  const svg = page.locator('.art-fig svg[role="img"]');
  const desc = (await svg.locator('desc').textContent())!;
  const groups = await page.locator('[data-skill-group][id^="group-"]').all();
  const counts: Record<string, number> = {};
  for (const g of groups) counts[(await g.getAttribute('data-skill-group'))!] = Number(await g.locator('[data-group-count]').textContent());
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  expect(desc).toContain(`${total} in all`);
  const cells = await svg.locator('g').evaluateAll((gs) =>
    gs.map((g) => {
      const r = g.querySelector('rect')!;
      return { name: g.querySelector('text')!.textContent!, area: Number(r.getAttribute('width')) * Number(r.getAttribute('height')) };
    }),
  );
  expect(cells).toHaveLength(Object.keys(counts).length);
  const sum = cells.reduce((s, c) => s + c.area, 0);
  for (const c of cells) {
    expect(desc).toContain(`${c.name} ${counts[c.name]}`);
    expect(c.area / sum).toBeCloseTo(counts[c.name] / total, 4);
  }
});

test('strokes are fully visible with reduced motion and animate otherwise (where scroll timelines exist)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/offer/');
  const draw = page.locator('main svg .draw').first();
  expect(await draw.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await draw.evaluate((el) => getComputedStyle(el).strokeDasharray)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  if (supported) expect(await draw.evaluate((el) => getComputedStyle(el).animationName)).toBe('art-draw');
});

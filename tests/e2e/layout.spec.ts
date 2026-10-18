import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { builtPages } from '../../scripts/pages.mjs';

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

test('built output has at most 3 woff2 files, 150 KB in total, all font-display: swap', () => {
  const fonts = walk('dist', '.woff2');
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.length).toBeLessThanOrEqual(3);
  const total = fonts.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  expect(total).toBeLessThanOrEqual(150 * 1024);

  const css = walk('dist', '.css').map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
  expect(faces.length).toBeGreaterThan(0);
  for (const face of faces) expect(face).toMatch(/font-display:\s*swap/);
});

test('loading / makes no request to another host', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('data:') && new URL(req.url()).origin !== origin) foreign.push(req.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(foreign).toEqual([]);
});

for (const route of builtPages()) {
  test.describe(route, () => {
    test('landmarks, lang, skip link first', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('body > header')).toHaveCount(1);
      await expect(page.locator('body > header nav')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('body > footer')).toHaveCount(1);
      await page.keyboard.press('Tab');
      const first = page.locator(':focus');
      await expect(first).toHaveClass(/skip-link/);
      await expect(first).toBeInViewport();
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => location.hash)).toBe('#main');
    });

    test('no horizontal scroll', async ({ page, viewport }) => {
      await page.goto(route);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport!.width);
    });

    test('header and footer controls are >= 44 px with a visible focus outline', async ({ page }) => {
      await page.goto(route);
      const links = page.locator('body > header a, body > footer a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const box = await link.boundingBox();
        const label = (await link.textContent())?.trim();
        expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
        expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
        await link.focus();
        const outline = await link.evaluate((el) => {
          const s = getComputedStyle(el);
          return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
        });
        expect(outline.style, `${label} outline style`).not.toBe('none');
        expect(outline.width, `${label} outline width`).toBeGreaterThanOrEqual(2);
      }
    });
  });
}

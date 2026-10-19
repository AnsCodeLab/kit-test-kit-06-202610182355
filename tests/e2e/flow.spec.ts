import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const flow = JSON.parse(fs.readFileSync('src/data/flow.json', 'utf8')) as typeof import('../../src/data/flow.json');
const names = flow.stages.map((s) => s.name);

const pages = [
  { route: '/', name: 'Home' },
  { route: '/docs/the-flow/', name: 'Docs: the flow' },
];

// The drawing that is showing: the other one is display:none.
const visible = (page: Page) => page.locator('[data-flow] svg:visible');

for (const p of pages) {
  test.describe(p.name, () => {
    test('has one diagram: role=img, title, long text alternative, four stages in order', async ({ page }) => {
      await page.goto(p.route);
      await expect(page.locator('[data-flow]')).toHaveCount(1);
      const svg = visible(page);
      await expect(svg).toHaveCount(1);
      await expect(svg).toHaveAttribute('role', 'img');
      const title = await svg.evaluate((el) => document.getElementById(el.getAttribute('aria-labelledby')!)!.textContent);
      expect(title).toBe(flow.title);
      const desc = await svg.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!);
      expect(desc.length).toBeGreaterThan(400);
      for (const s of flow.stages) expect(desc).toContain(s.description);
      const drawn = await svg.locator('text.t-name').allTextContents();
      expect(drawn).toEqual(names);
      const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
      expect(new Set(ids).size, 'unique ids').toBe(ids.length);
    });

    test('axe: no violations', async ({ page }) => {
      await page.goto(p.route);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    for (const vp of [
      { width: 375, height: 812, layout: 'narrow' },
      { width: 768, height: 900, layout: 'either' },
      { width: 1440, height: 900, layout: 'wide' },
    ]) {
      test(`at ${vp.width}: ${vp.layout} layout, no horizontal scroll, text >= 14 px, nothing overlaps or leaves the drawing`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(p.route);
        await page.evaluate(() => document.fonts.ready);
        const svg = visible(page);
        if (vp.layout !== 'either') await expect(svg).toHaveAttribute('data-flow-view', vp.layout);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        const report = await svg.evaluate((el) => {
          const root = el as unknown as SVGSVGElement;
          const vb = root.viewBox.baseVal;
          const texts = [...root.querySelectorAll<SVGTextElement>('text')].map((t) => {
            const b = t.getBBox();
            const m = t.getScreenCTM()!;
            return {
              text: t.textContent!.trim().slice(0, 30),
              size: parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b),
              // Axis-aligned box in user space of the root (rotated text swaps width and height).
              box: t.hasAttribute('transform') ? { x: b.y - 0, y: b.x, w: b.height, h: b.width, rot: true } : { x: b.x, y: b.y, w: b.width, h: b.height, rot: false },
              raw: { x: b.x, y: b.y, w: b.width, h: b.height },
            };
          });
          return { vb: { w: vb.width, h: vb.height }, texts };
        });
        for (const t of report.texts) expect(t.size, t.text).toBeGreaterThanOrEqual(14);
        for (const t of report.texts) {
          const b = t.raw;
          if (t.box.rot) continue;
          expect(b.x, `${t.text} left`).toBeGreaterThanOrEqual(-1);
          expect(b.x + b.w, `${t.text} right`).toBeLessThanOrEqual(report.vb.w + 1);
          expect(b.y + b.h, `${t.text} bottom`).toBeLessThanOrEqual(report.vb.h + 1);
        }
        const flat = report.texts.filter((t) => !t.box.rot).map((t) => t.raw);
        for (let i = 0; i < flat.length; i++)
          for (let j = i + 1; j < flat.length; j++) {
            const a = flat[i];
            const b = flat[j];
            const overlap = a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
            expect(overlap, `${report.texts[i].text} overlaps ${report.texts[j].text}`).toBe(false);
          }
      });
    }

    test('with motion allowed scrolling the diagram into view does not change its size', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(p.route);
      const size = async () => {
        const b = (await page.locator('[data-flow]').boundingBox())!;
        return [b.width, b.height];
      };
      const before = await size();
      await page.locator('[data-flow]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      expect(await size()).toEqual(before);
    });

    test('with reduced motion no animation runs on the diagram', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(p.route);
      const running = await page.evaluate(() => document.querySelector('[data-flow]')!.getAnimations({ subtree: true }).length);
      expect(running).toBe(0);
    });
  });
}

test('Home: the diagram comes right after the install section', async ({ page }) => {
  await page.goto('/');
  const labels = await page.locator('section.row > .label').allTextContents();
  expect(labels.slice(0, 3)).toEqual(['/install', '/flow', '/writes']);
});

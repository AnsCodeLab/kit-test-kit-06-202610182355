// Checks added by the KRK06-21 UI review: focus rings that stay inside the viewport and "Next:" chapter links at tap height.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

for (const route of ['/', '/docs/']) {
  test(`${route}: every focus stop shows a ring that is not cut off`, async ({ page, baseURL }) => {
    await page.goto(new URL(route, baseURL).href, { waitUntil: 'networkidle' });
    const problems: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const reach = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset);
        return {
          label: (el.textContent || el.tagName).trim().slice(0, 30),
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          topRoom: box.top + window.scrollY - reach,
          leftRoom: box.left - reach,
        };
      });
      if (!r) break;
      if (r.style === 'none' || r.width < 2) problems.push(`no visible ring on "${r.label}"`);
      if (r.topRoom < 0 || r.leftRoom < 0) problems.push(`ring cut off by the page edge on "${r.label}"`);
    }
    expect(problems).toEqual([]);
  });
}

test('"Next:" chapter links are at least 44 px tall', async ({ page, baseURL }) => {
  await page.goto(new URL('/docs/measuring-effectiveness/', baseURL).href);
  const links = page.locator('.prose p > strong:first-child + a:last-child');
  expect(await links.count()).toBeGreaterThan(0);
  for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
});

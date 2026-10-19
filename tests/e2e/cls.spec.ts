import { test, expect } from '@playwright/test';
import { auditPages } from '../../scripts/audit-pages.mjs';

const MAX_CLS = 0.05;

test.skip(({ viewport }) => viewport?.width === 768, 'CLS runs at 375 and 1440 px');

// Layout shift over the whole page load, including the swap from the metric-matched fallback faces to the web fonts.
// The late-swap case is covered by fonts-fallback.spec.ts, which checks the fallback metrics themselves.
for (const route of auditPages) {
  test(`CLS <= ${MAX_CLS} on ${route}`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length);
    expect(loaded, 'web fonts should have loaded').toBeGreaterThan(0);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(MAX_CLS);
  });
}

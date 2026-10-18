import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { builtPages } from '../../scripts/pages.mjs';

for (const route of builtPages()) {
  test(`axe: no violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

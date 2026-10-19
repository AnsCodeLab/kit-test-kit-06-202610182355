import { test, expect } from '@playwright/test';

// KRK06-25: the Home command is a display-size anchor (at least 3x body), fits its viewport, and the accent stays rare.
for (const vp of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`home display command is at least 3x body size and inside the first screen at ${vp.width}`, async ({ page }, info) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    const cmd = page.locator('[data-install] code');
    const { size, body, right, left } = await cmd.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        size: parseFloat(getComputedStyle(el).fontSize),
        body: parseFloat(getComputedStyle(document.body).fontSize),
        right: r.right,
        left: r.left,
      };
    });
    expect(size).toBeGreaterThanOrEqual(body * 3);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(vp.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = (await cmd.boundingBox())!;
    expect(box.y).toBeLessThan(vp.height);
    await page.screenshot({ path: info.outputPath(`home-${vp.width}.png`) });
  });
}

test('the copied command text is unchanged by the display line breaks', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('[data-install] code').evaluate((el) => el.textContent!.trim());
  expect(text).toBe('npx @anscodelab/coding-agent-kit');
});

test('every page title uses the poster scale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/product/', '/docs/', '/about/']) {
    await page.goto(path);
    const size = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(64);
  }
});

test('the teal band is full width and causes no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const band = page.locator('section.band');
  await expect(band).toHaveCount(1);
  expect(await band.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('rgb(10, 80, 80)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

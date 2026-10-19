import { test, expect } from '@playwright/test';

// KRK06-27: the Home h1 is the anchor of the first screen. The install command is one line at 2 to 2.5x body, the Copy
// button sits directly under it, and the command text appears once in the first screen's visible text.
const CMD = 'npx @anscodelab/coding-agent-kit';
for (const vp of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
]) {
  test(`home h1 outranks a one-line command with the button under it at ${vp.width}`, async ({ page }, info) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    const cmd = page.locator('[data-install] code');
    const m = await page.evaluate(() => {
      const code = document.querySelector('[data-install] code')!;
      const btn = document.querySelector('[data-install] button')!;
      const h1 = document.querySelector('h1')!;
      const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
      const c = code.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      return {
        h1: px(h1),
        cmd: px(code),
        body: px(document.body),
        lineHeight: parseFloat(getComputedStyle(code).lineHeight),
        cmdHeight: c.height,
        cmdBottom: c.bottom,
        btnTop: b.top,
        btnBottom: b.bottom,
        btnLeft: b.left,
        cmdLeft: c.left,
        noScroll: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(m.h1).toBeGreaterThan(m.cmd);
    expect(m.cmd).toBeGreaterThanOrEqual(m.body * 2);
    expect(m.cmd).toBeLessThanOrEqual(m.body * 2.5);
    // one line: the box is one line tall (padding included), so it did not wrap
    expect(m.cmdHeight).toBeLessThan(m.lineHeight * 2);
    expect(m.btnTop).toBeGreaterThanOrEqual(m.cmdBottom - 1);
    expect(m.btnTop - m.cmdBottom).toBeLessThan(40);
    expect(m.btnLeft).toBeCloseTo(m.cmdLeft, 0);
    expect(m.noScroll).toBe(true);
    if (vp.width === 1440) expect(m.btnBottom).toBeLessThanOrEqual(vp.height);
    await expect(cmd).toBeVisible();
    await page.screenshot({ path: info.outputPath(`home-${vp.width}.png`) });
  });
}

test('the command string appears once in the first screen visible text at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // Leaf-most elements (HTML or SVG text) in the first screen whose text holds the whole command.
  const count = await page.evaluate((cmd) => {
    const norm = (t: string | null) => (t ?? '').replace(/\s+/g, ' ');
    return [...document.querySelectorAll('main *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if ((r.width === 0 && r.height === 0) || r.top >= window.innerHeight) return false;
      if (!norm(el.textContent).includes(cmd)) return false;
      return ![...el.children].some((c) => norm(c.textContent).includes(cmd));
    }).length;
  }, CMD);
  expect(count).toBe(1);
});

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

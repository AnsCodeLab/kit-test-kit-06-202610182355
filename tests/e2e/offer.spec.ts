import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const readme = fs.readFileSync('content/README.md', 'utf8');

test('head: 200, one h1, unique title and description, headings for Free, Pro Pack and Services', async ({ page }) => {
  const res = await page.goto('/offer/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  const title = await page.title();
  const description = await page.locator('meta[name=description]').getAttribute('content');
  expect(title.length).toBeGreaterThan(10);
  expect(description?.length).toBeGreaterThan(30);
  for (const other of ['/', '/product/', '/docs/', '/about/']) {
    await page.goto(other);
    expect(await page.title()).not.toBe(title);
    const others = await page.locator('meta[name=description]').evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    expect(others).not.toContain(description);
  }
  await page.goto('/offer/');
  for (const name of ['Free', 'Pro Pack', 'Services']) {
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${name}`) })).toBeVisible();
  }
});

test('states the Pro Pack is planned and names its components and the services', async ({ page }) => {
  await page.goto('/offer/');
  const pro = page.locator('[data-offer=pro-pack]');
  await expect(pro).toContainText(/planned/i);
  for (const t of ['Private skills', 'Templates', 'Team policy presets']) await expect(pro).toContainText(t);
  await expect(pro).toContainText('licence key');
  const services = page.locator('[data-offer=services]');
  for (const t of ['Team onboarding', 'Setup for your repositories', 'Priority support']) await expect(services).toContainText(t);
  await expect(page.locator('[data-offer=free]')).toContainText('MIT');
  await expect(page.locator('[data-pricing]')).toContainText('Ask about the Pro Pack');
});

test('contact call to action is descriptive and points to a URL found in the README', async ({ page }) => {
  await page.goto('/offer/');
  const cta = page.locator('a[data-contact]');
  await expect(cta).toHaveCount(1);
  expect((await cta.innerText()).trim().split(/\s+/).length).toBeGreaterThanOrEqual(3);
  const href = (await cta.getAttribute('href'))!;
  expect(href).toMatch(/^(mailto:|https:\/\/)/);
  expect(readme).toContain(href);
});

test('no currency, percentage, form or data-posting element', async ({ page }) => {
  await page.goto('/offer/');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\d\s*(?:[$€£¥]|USD|EUR|GBP|VND)|[$€£¥]\s*\d|%/i);
  await expect(page.locator('form, input, select, textarea')).toHaveCount(0);
});

for (const w of [375, 768, 1440]) {
  test(`no horizontal scroll, no clipped text and 44 px targets at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/offer/');
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

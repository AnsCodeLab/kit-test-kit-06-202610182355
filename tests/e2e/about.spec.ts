import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const readme = fs.readFileSync('content/README.md', 'utf8');

test('head: 200, one h1, one main, unique title and description', async ({ page }) => {
  const res = await page.goto('/about/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  const title = await page.title();
  const description = await page.locator('meta[name=description]').getAttribute('content');
  expect(title.length).toBeGreaterThan(10);
  expect(description?.length).toBeGreaterThan(30);
  for (const other of ['/', '/product/', '/docs/', '/offer/']) {
    await page.goto(other);
    expect(await page.title()).not.toBe(title);
    const others = await page.locator('meta[name=description]').evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    expect(others).not.toContain(description);
  }
});

test('states no network, no credentials written and no overwriting, each with its source file', async ({ page }) => {
  await page.goto('/about/');
  const never = page.locator('[data-about=never]');
  await expect(never).toContainText('No network, no secrets.');
  await expect(never).toContainText('never writes credentials');
  await expect(never).toContainText('without overwriting anything you already have');
  await expect(never).toContainText('writes files and exits');
  await expect(never).toContainText('changes nothing');
  await expect(never.locator('cite').first()).toHaveText('README.md');
  await expect(page.locator('[data-about=licence]')).toContainText('MIT');
});

test('every claim item shows its quote and names its source file', async ({ page }) => {
  await page.goto('/about/');
  const items = page.locator('[data-claim]');
  expect(await items.count()).toBeGreaterThanOrEqual(10);
  for (const li of await items.all()) {
    await expect(li.locator('q')).not.toBeEmpty();
    await expect(li.locator('cite')).toHaveText(/^(README\.md|THIRD-PARTY\.md|LICENSE)$/);
  }
});

test('repository link is the README repository link', async ({ page }) => {
  await page.goto('/about/');
  const href = (await page.locator('a[data-repository]').getAttribute('href'))!;
  expect(href).toMatch(/^https:\/\//);
  expect(readme).toContain(`(${href})`);
});

test('links to /license/ and /third-party/ exist', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('a[href="/license/"]')).toHaveCount(1);
  await expect(page.locator('a[href="/third-party/"]')).toHaveCount(1);
});

for (const target of ['/license/', '/third-party/']) {
  test(`${target} returns 200 with one h1`, async ({ page }) => {
    const res = await page.goto(target);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('the licence page shows the synced LICENSE text', async ({ page }) => {
  await page.goto('/license/');
  const text = await page.locator('[data-license]').innerText();
  expect(text.replace(/\s+/g, ' ').trim()).toBe(fs.readFileSync('content/LICENSE', 'utf8').replace(/\s+/g, ' ').trim());
});

test('no digit-percent and none of the unsupported claim words', async ({ page }) => {
  await page.goto('/about/');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\d\s*%/);
  expect(text).not.toMatch(/audited|certified|trusted by|customers/i);
});

for (const w of [375, 768, 1440]) {
  test(`no horizontal scroll, no clipped text and 44 px targets at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/about/');
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

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { builtPages } from '../../scripts/pages.mjs';

test('/privacy/ is 200 with one h1 and plain no-data statements', async ({ page }) => {
  const res = await page.goto('/privacy/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  const text = (await page.locator('main').innerText()).toLowerCase();
  expect(text).toContain('collects no data');
  expect(text).toContain('no cookies');
  expect(text).toContain('no third-party services');
  expect(text).toContain('no analytics');
});

test('footer links to /privacy/', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href="/privacy/"]')).toHaveCount(1);
});

test('loading / and /privacy/ sets 0 cookies and makes 0 requests to other origins', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:') && new URL(r.url()).origin !== origin) foreign.push(r.url());
  });
  for (const route of ['/', '/privacy/']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
  }
  expect(await context.cookies()).toEqual([]);
  expect(foreign).toEqual([]);
});

test('dist/404.html has lang, one h1 and links to / and /docs/', async () => {
  const html = fs.readFileSync('dist/404.html', 'utf8');
  expect(html).toMatch(/<html lang="en"/);
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(html).toContain('href="/"');
  expect(html).toContain('href="/docs/"');
});

// The CI static server answers unknown paths with its own stub, so the unknown-path check
// runs against the repo server (scripts/serve.mjs), which serves dist/404.html for them.
test('an unknown path on the served build returns the 404 page content', async ({ page }, testInfo) => {
  const port = 4191 + testInfo.parallelIndex;
  const server = spawn('node', ['scripts/serve.mjs', 'dist', String(port)], { stdio: 'ignore' });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base);
        break;
      } catch {
        if (i === 49) throw new Error(`scripts/serve.mjs did not start on ${base}`);
        await sleep(100);
      }
    }
    const res = await page.goto(`${base}/no/such/page/`);
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found');
    await expect(page.locator('main a[href="/"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/docs/"]')).toHaveCount(1);
  } finally {
    server.kill();
  }
});

test('axe finds nothing on the 404 page and nothing scrolls sideways', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('h1')).toHaveText('Page not found');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('axe finds nothing on /privacy/ and nothing scrolls sideways', async ({ page }) => {
  await page.goto('/privacy/');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('/robots.txt is text/plain, allows all and names the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/plain');
  const body = await res.text();
  expect(body).toMatch(/^Allow: \/$/m);
  expect(body).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
});

test('/sitemap.xml is valid, complete, excludes 404 and maps to dist files', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml.startsWith('<?xml')).toBe(true);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = locs.map((l) => new URL(l).pathname);
  expect(locs.every((l) => /^https?:\/\//.test(l))).toBe(true);
  expect(xml.match(/<url>/g)).toHaveLength(locs.length);
  expect(xml.match(/<\/url>/g)).toHaveLength(locs.length);
  expect(paths.some((p) => p.includes('404'))).toBe(false);
  const expected = builtPages().map((p) => (p === '/' ? '/' : p + '/'));
  expect([...paths].sort()).toEqual([...expected].sort());
  for (const p of paths) {
    const file = p === '/' ? 'dist/index.html' : `dist${p}index.html`;
    expect(fs.existsSync(file), file).toBe(true);
  }
});

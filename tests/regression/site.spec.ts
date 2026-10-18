// Site-wide checks that need every page or the dist/ files rather than one page at a time.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { allPaths, distPaths, sitemapPaths } from './pages';

const KB = 1024;
const routes = allPaths();

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

test('sitemap and dist/ list the same pages', () => {
  console.log(`regression: ${routes.length} pages from the sitemap and dist/, plus the 404 page`);
  expect(sitemapPaths()).toEqual(distPaths());
  expect(routes.length).toBeGreaterThan(0);
});

test('every page has a unique title', async ({ page, baseURL }) => {
  const seen = new Map<string, string[]>();
  for (const route of routes) {
    await page.goto(new URL(route, baseURL).href);
    const title = (await page.title()).trim();
    seen.set(title, [...(seen.get(title) ?? []), route]);
  }
  const duplicates = [...seen].filter(([, rs]) => rs.length > 1);
  expect(duplicates).toEqual([]);
});

test('internal links and fragments resolve on every page', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const ids = new Map<string, Set<string>>();
  const links: { from: string; url: URL }[] = [];
  for (const route of routes) {
    await page.goto(new URL(route, baseURL).href);
    ids.set(route, new Set(await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id))));
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    for (const h of hrefs) {
      const url = new URL(h);
      if (url.origin === origin) links.push({ from: route, url });
    }
  }
  const status = new Map<string, number>();
  const broken: string[] = [];
  for (const { from, url } of links) {
    const key = url.pathname + url.search;
    if (!status.has(key)) status.set(key, (await page.request.get(key.startsWith('/') ? origin + key : key)).status());
    if (status.get(key) !== 200) broken.push(`${from} -> ${key} (${status.get(key)})`);
    else if (url.hash && url.hash.length > 1) {
      const target = ids.get(url.pathname);
      if (target && !target.has(decodeURIComponent(url.hash.slice(1)))) broken.push(`${from} -> ${url.pathname}${url.hash} (no such id)`);
    }
  }
  console.log(`regression: ${links.length} internal links, ${status.size} distinct targets checked`);
  expect(broken).toEqual([]);
});

test('Home transfer size excluding images is at most 300 KB', async ({ page, baseURL }) => {
  const sizes: { url: string; bytes: number }[] = [];
  const pending: Promise<void>[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'image') return;
    pending.push(res.body().then((b) => void sizes.push({ url: res.url(), bytes: b.length })).catch(() => undefined));
  });
  await page.goto(new URL('/', baseURL).href, { waitUntil: 'networkidle' });
  await Promise.all(pending);
  const total = sizes.reduce((sum, s) => sum + s.bytes, 0);
  console.log(`regression: Home transfer excluding images = ${(total / KB).toFixed(1)} KB across ${sizes.length} requests (limit 300 KB)`);
  expect(total).toBeLessThanOrEqual(300 * KB);
});

test('woff2 fonts total at most 150 KB in at most 3 files', () => {
  const fonts = walk('dist', '.woff2');
  const total = fonts.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`regression: ${fonts.length} woff2 file(s), ${(total / KB).toFixed(1)} KB total (limit 150 KB, 3 files)`);
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.length).toBeLessThanOrEqual(3);
  expect(total).toBeLessThanOrEqual(150 * KB);
});

test('Home cumulative layout shift is at most 0.05', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(new URL('/', baseURL).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  console.log(`regression: Home CLS = ${cls.toFixed(4)} (limit 0.05)`);
  expect(cls).toBeLessThanOrEqual(0.05);
});

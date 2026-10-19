import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { runHealthcheck, expectedHeaders, isLocal } from '../../scripts/healthcheck.mjs';

const page = (title: string, h1 = '<h1>Hello</h1>') => `<!doctype html><html><head><title>${title}</title></head><body>${h1}</body></html>`;

function fixture(pages: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-'));
  const write = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  for (const [p, body] of Object.entries(pages)) write(p, body);
  const locs = Object.keys(pages)
    .filter((p) => p !== '404.html')
    .map((p) => `<url><loc>https://example.invalid/${p === 'index.html' ? '' : p.replace(/\/index\.html$/, '/')}</loc></url>`);
  write('sitemap.xml', `<urlset>${locs.join('')}</urlset>`);
  write('robots.txt', 'User-agent: *\n');
  return { dir, write };
}

type Stub = { url: string; close: () => Promise<void>; hits: string[] };
const open: Stub[] = [];
// Stub server over a directory. `override` can replace the response for chosen paths.
async function serve(dir: string, override: Record<string, { status: number; type?: string; headers?: Record<string, string> }> = {}, extra: Record<string, string> = {}) {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    const p = (req.url ?? '/').split('?')[0];
    hits.push(p);
    const o = override[p];
    const base = path.join(dir, p);
    const file = [base, base + '.html', path.join(base, 'index.html')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    const type = o?.type ?? (file?.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain');
    res.writeHead(o?.status ?? (file ? 200 : 404), { 'content-type': type, ...extra, ...o?.headers });
    res.end(file ? fs.readFileSync(file) : 'Not found');
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  const stub: Stub = {
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    close: () => new Promise((r) => server.close(() => r())),
    hits,
  };
  open.push(stub);
  return stub;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.close()));
});

const good = { 'index.html': page('Home'), 'about/index.html': page('About'), '404.html': page('Not found') };

describe('healthcheck', () => {
  it('passes against a healthy site and lists one row per url with its status', async () => {
    const { dir } = fixture(good);
    const s = await serve(dir);
    const { rows, failures } = await runHealthcheck(s.url);
    expect(failures).toEqual([]);
    expect(rows.map((r) => `${r.status} ${r.path}`)).toEqual([
      '200 /sitemap.xml',
      '200 /',
      '200 /about/',
      '200 /robots.txt',
      '404 /sitemap-index.xml',
      '404 /healthcheck-nonexistent',
    ]);
  });

  it('fails when one page returns 500', async () => {
    const { dir } = fixture(good);
    const s = await serve(dir, { '/about/': { status: 500 } });
    const { failures } = await runHealthcheck(s.url);
    expect(failures.map((f) => [f.path, f.class])).toEqual([['/about/', 'status']]);
  });

  it('fails when the unknown path does not return 404', async () => {
    const { dir } = fixture(good);
    const s = await serve(dir, { '/healthcheck-nonexistent': { status: 200 } });
    const { failures } = await runHealthcheck(s.url);
    expect(failures.map((f) => f.class)).toEqual(['not-found']);
  });

  it('reads the page list from the sitemap, so a new page needs no script change', async () => {
    const f = fixture(good);
    f.write('docs/index.html', page('Docs'));
    f.write('sitemap.xml', fs.readFileSync(path.join(f.dir, 'sitemap.xml'), 'utf8').replace('</urlset>', '<url><loc>https://example.invalid/docs/</loc></url></urlset>'));
    const s = await serve(f.dir);
    const { rows, failures } = await runHealthcheck(s.url);
    expect(failures).toEqual([]);
    expect(rows.map((r) => r.path)).toContain('/docs/');
    expect(s.hits).toContain('/docs/');
  });

  it('flags a sitemapped page that does not exist', async () => {
    const f = fixture(good);
    f.write('sitemap.xml', '<urlset><url><loc>https://example.invalid/gone/</loc></url></urlset>');
    const s = await serve(f.dir);
    const { failures } = await runHealthcheck(s.url);
    expect(failures.map((x) => [x.path, x.class])).toEqual([['/gone/', 'status']]);
  });

  it('checks content type, title and exactly one h1', async () => {
    const f = fixture({ ...good, 'a/index.html': page(''), 'b/index.html': page('B', '<h1>x</h1><h1>y</h1>'), 'c/index.html': page('C', '<h2>no h1</h2>') });
    const s = await serve(f.dir, { '/about/': { status: 200, type: 'text/plain' } });
    const { failures } = await runHealthcheck(s.url);
    expect(Object.fromEntries(failures.map((x) => [x.path, x.class]))).toEqual({
      '/about/': 'content-type',
      '/a/': 'title',
      '/b/': 'h1',
      '/c/': 'h1',
    });
  });

  it('follows a sitemap index', async () => {
    const f = fixture(good);
    f.write('sitemap.xml', '<sitemapindex><sitemap><loc>https://example.invalid/sitemap-0.xml</loc></sitemap></sitemapindex>');
    f.write('sitemap-0.xml', '<urlset><url><loc>https://example.invalid/about/</loc></url></urlset>');
    const s = await serve(f.dir);
    const { rows, failures } = await runHealthcheck(s.url);
    expect(failures).toEqual([]);
    expect(rows.map((r) => r.path)).toContain('/about/');
  });

  it('reports an unreachable target', async () => {
    const { dir } = fixture(good);
    const s = await serve(dir);
    await s.close();
    open.splice(0);
    const { failures } = await runHealthcheck(s.url);
    expect(failures[0].class).toBe('unreachable');
  });
});

describe('security headers', () => {
  const headersText = '/*\n  X-Content-Type-Options: nosniff\n  Strict-Transport-Security: max-age=1\n\n/_astro/*\n  Cache-Control: public, immutable\n';
  it('reads the names set for /* only', () => {
    expect(expectedHeaders(headersText)).toEqual(['x-content-type-options', 'strict-transport-security']);
  });
  it('treats localhost addresses as local', () => {
    expect(isLocal('http://localhost:4321')).toBe(true);
    expect(isLocal('http://127.0.0.1:1')).toBe(true);
    expect(isLocal('https://site.test')).toBe(false);
  });
  it('requires the headers on a non-local target and not on a local one', async () => {
    const f = fixture(good);
    f.write('_headers', headersText);
    const headersFile = path.join(f.dir, '_headers');
    const s = await serve(f.dir);
    expect((await runHealthcheck(s.url, { headersFile })).failures).toEqual([]);
    // Same server reached through a non-local host name: 127.0.0.2 is not in the local list.
    const remote = s.url.replace('127.0.0.1', '127.0.0.2');
    const missing = await runHealthcheck(remote, { headersFile });
    expect(missing.failures.length).toBeGreaterThan(0);
    expect(missing.failures.every((x) => x.class === 'headers')).toBe(true);
    const withHeaders = await serve(f.dir, {}, { 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=1' });
    const ok = await runHealthcheck(withHeaders.url.replace('127.0.0.1', '127.0.0.2'), { headersFile });
    expect(ok.failures).toEqual([]);
  });
});

describe('cli', () => {
  const script = path.resolve('scripts/healthcheck.mjs');
  // Async on purpose: the stub servers live in this process, so the event loop must stay free.
  const run = (cwd: string, args: string[] = []) =>
    new Promise<{ status: number; stdout: string; stderr: string }>((resolve) =>
      execFile(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HEALTH_URL: '' } }, (err, stdout, stderr) =>
        resolve({ status: err ? Number(err.code) : 0, stdout, stderr }),
      ),
    );

  it('serves dist/ itself, prints a line per url and exits 0', async () => {
    const f = fixture(good);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-'));
    fs.cpSync(f.dir, path.join(root, 'dist'), { recursive: true });
    const r = await run(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/200\s+page\s+\/about\//);
    expect(r.stdout).toContain('healthcheck passed');
  });

  it('exits non-zero with a clear message when a page fails', async () => {
    const f = fixture(good);
    const s = await serve(f.dir, { '/about/': { status: 500 } });
    const r = await run(os.tmpdir(), [s.url]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('healthcheck FAILED (status): /about/');
  });

  it('exits non-zero when there is no URL and no dist/', async () => {
    const r = await run(fs.mkdtempSync(path.join(os.tmpdir(), 'empty-')));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('npm run build');
  });
});

describe('script hygiene', () => {
  it('has no hard-coded remote URL', () => {
    const src = fs.readFileSync('scripts/healthcheck.mjs', 'utf8');
    const urls = src.match(/https?:\/\/[^\s'"`)]+/g) ?? [];
    expect(urls.filter((u) => !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u))).toEqual([]);
  });
});

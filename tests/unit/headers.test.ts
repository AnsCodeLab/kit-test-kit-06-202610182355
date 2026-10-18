import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { parseHeaders, headersFor, startHeadersServer } from '../helpers/headers-server.mjs';

const rules = parseHeaders(fs.readFileSync('public/_headers', 'utf8'));
const all = headersFor(rules, '/about/');

describe('public/_headers', () => {
  it('sets the security headers for /*', () => {
    expect(all['x-content-type-options']).toBe('nosniff');
    expect(all['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(all['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(all['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('has a CSP with no unsafe keywords and no host other than self', () => {
    const csp = all['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/https?:|\/\/|\*/);
    const directives = Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
    for (const d of ['default-src', 'script-src', 'style-src', 'font-src', 'connect-src', 'base-uri', 'form-action']) {
      expect(directives[d]).toEqual(["'self'"]);
    }
    expect(directives['img-src']).toEqual(["'self'", 'data:']);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
  });

  it('revalidates HTML and caches hashed assets immutably', () => {
    expect(headersFor(rules, '/')['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headersFor(rules, '/_astro/Base.abc.css')['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});

describe('headers server', () => {
  let server: Awaited<ReturnType<typeof startHeadersServer>>;
  beforeAll(async () => {
    if (!fs.existsSync('dist/_headers')) return;
    server = await startHeadersServer('dist');
  });
  afterAll(async () => server?.close());

  it.skipIf(!fs.existsSync('dist/_headers'))('dist/_headers is the public file and is applied to responses', async () => {
    expect(fs.readFileSync('dist/_headers', 'utf8')).toBe(fs.readFileSync('public/_headers', 'utf8'));
    const page = await fetch(server.url + '/');
    expect(page.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(page.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    const asset = fs.readdirSync('dist/_astro').find((f) => f.endsWith('.css'))!;
    const res = await fetch(`${server.url}/_astro/${asset}`);
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

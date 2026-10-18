// Negative tests: the audit must fail on deliberately broken HTML, and pass on the clean control.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';
import { auditPage } from './audit';

const page = (body: string, head = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>${head}</head>` +
  `<body><header><nav aria-label="Primary"><a href="/" style="display:inline-block;min-width:44px;min-height:44px">Home</a></nav></header>` +
  `<main>${body}</main><footer>Footer</footer></body></html>`;

const CLEAN = '<h1>Title</h1><h2>Sub</h2><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">';
const fixtures: Record<string, string> = {
  '/clean': page(CLEAN),
  '/missing-alt': page('<h1>Title</h1><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">'),
  '/missing-h1': page('<h2>Sub</h2>'),
  '/external-script': page(CLEAN, '<script src="http://127.0.0.1:9/tracker.js"></script>'),
  '/small-button': page(`${CLEAN}<button style="width:120px;height:40px">Go</button>`),
};

let server: http.Server;
let base: string;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const html = fixtures[req.url ?? ''];
    res.writeHead(html ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html ?? 'not found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(() => server.close());

test('control fixture passes the audit', async ({ page }) => {
  const { violations } = await auditPage(page, base + '/clean');
  expect(violations).toEqual([]);
});

const broken: [string, RegExp][] = [
  ['/missing-alt', /img without alt/],
  ['/missing-h1', /exactly one h1, found 0/],
  ['/external-script', /request to another origin: http:\/\/127\.0\.0\.1:9\/tracker\.js/],
  ['/small-button', /target 120x40 px is under 44x44/],
];

for (const [path, expected] of broken) {
  test(`audit fails on ${path.slice(1)}`, async ({ page }) => {
    const { violations } = await auditPage(page, base + path);
    expect(violations.join('\n')).toMatch(expected);
  });
}

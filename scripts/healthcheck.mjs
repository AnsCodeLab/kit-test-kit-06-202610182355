// Health check for a served copy of the site.
// Usage: node scripts/healthcheck.mjs [baseUrl]   (or env HEALTH_URL)
// With no URL it serves dist/ on an ephemeral local port and checks that, so it works right after a build.
// Fetches every URL in the sitemap plus /robots.txt, /sitemap-index.xml and an unknown path (expects 404).
// Pages must be 200, text/html, with a non-empty title and exactly one h1. When the target is not local,
// the security headers named in the headers file for /* must be present too.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);
const UNKNOWN_PATH = '/healthcheck-nonexistent';
// Failure classes, in the order they are reported.
const CLASSES = ['unreachable', 'status', 'content-type', 'title', 'h1', 'headers', 'not-found'];

export const isLocal = (base) => LOCAL_HOSTS.has(new URL(base).hostname);

// Names of the headers the headers file sets for the /* rule, minus caching which is not a security header.
export function expectedHeaders(text) {
  const names = [];
  let inAll = false;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      inAll = raw.trim() === '/*';
      continue;
    }
    const line = raw.trim();
    if (!inAll || line.startsWith('!')) continue;
    const name = line.slice(0, line.indexOf(':')).trim().toLowerCase();
    if (name && name !== 'cache-control' && !names.includes(name)) names.push(name);
  }
  return names;
}

// Pulls <loc> values out of a sitemap, reduced to paths so the origin written at build time does not matter.
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
const toPath = (loc) => {
  try {
    const u = new URL(loc);
    return u.pathname + u.search;
  } catch {
    return loc.startsWith('/') ? loc : `/${loc}`;
  }
};

async function get(base, p) {
  try {
    const res = await fetch(new URL(p, base), { redirect: 'manual' });
    return { res, body: await res.text() };
  } catch (err) {
    return { error: err.cause?.code ?? err.message };
  }
}

async function sitemapPages(base) {
  const root = await get(base, '/sitemap.xml');
  if (!root.res || root.res.status !== 200) return { pages: [], root };
  let entries = locs(root.body);
  if (/<sitemapindex/.test(root.body)) {
    const children = await Promise.all(entries.map((e) => get(base, toPath(e))));
    entries = children.flatMap((c) => (c.res?.status === 200 ? locs(c.body) : []));
  }
  return { pages: [...new Set(entries.map(toPath))], root };
}

// Returns { rows, failures }. Each row: { path, status, kind, ok, note, class }.
export async function runHealthcheck(base, { headersFile } = {}) {
  const rows = [];
  const fail = (row, cls, note) => {
    row.ok = false;
    row.class = cls;
    row.note = note;
  };
  const local = isLocal(base);
  const wanted = !local && headersFile && fs.existsSync(headersFile) ? expectedHeaders(fs.readFileSync(headersFile, 'utf8')) : [];

  const { pages, root } = await sitemapPages(base);
  const sitemapRow = { path: '/sitemap.xml', kind: 'sitemap', status: root.res?.status ?? '-', ok: true, note: '' };
  if (!root.res) fail(sitemapRow, 'unreachable', root.error);
  else if (root.res.status !== 200) fail(sitemapRow, 'status', 'expected 200');
  else if (!pages.length) fail(sitemapRow, 'status', 'sitemap lists no pages');
  rows.push(sitemapRow);

  const checkHeaders = (row, res) => {
    const missing = wanted.filter((h) => !res.headers.has(h));
    if (missing.length) fail(row, 'headers', `missing ${missing.join(', ')}`);
  };

  for (const p of pages) {
    const r = await get(base, p);
    const row = { path: p, kind: 'page', status: r.res?.status ?? '-', ok: true, note: '' };
    if (!r.res) fail(row, 'unreachable', r.error);
    else if (r.res.status !== 200) fail(row, 'status', 'expected 200');
    else if (!(r.res.headers.get('content-type') ?? '').toLowerCase().startsWith('text/html')) {
      fail(row, 'content-type', `got ${r.res.headers.get('content-type') ?? 'none'}`);
    } else if (!/<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(r.body)) fail(row, 'title', 'missing or empty title');
    else {
      const h1s = (r.body.match(/<h1[\s>]/gi) ?? []).length;
      if (h1s !== 1) fail(row, 'h1', `expected one h1, found ${h1s}`);
      else checkHeaders(row, r.res);
    }
    rows.push(row);
  }

  for (const p of ['/robots.txt', '/sitemap-index.xml']) {
    const r = await get(base, p);
    const row = { path: p, kind: 'file', status: r.res?.status ?? '-', ok: true, note: '' };
    if (!r.res) fail(row, 'unreachable', r.error);
    else if (r.res.status === 404 && p === '/sitemap-index.xml') row.note = 'skipped, site serves /sitemap.xml';
    else if (r.res.status !== 200) fail(row, 'status', 'expected 200');
    else checkHeaders(row, r.res);
    rows.push(row);
  }

  const nf = await get(base, UNKNOWN_PATH);
  const nfRow = { path: UNKNOWN_PATH, kind: 'unknown', status: nf.res?.status ?? '-', ok: true, note: '' };
  if (!nf.res) fail(nfRow, 'unreachable', nf.error);
  else if (nf.res.status !== 404) fail(nfRow, 'not-found', 'expected 404');
  rows.push(nfRow);

  return { rows, failures: rows.filter((r) => !r.ok) };
}

export function formatTable(rows) {
  const w = Math.max(...rows.map((r) => r.path.length), 4);
  return rows
    .map((r) => `${r.ok ? 'ok  ' : 'FAIL'}  ${String(r.status).padEnd(3)}  ${r.kind.padEnd(7)}  ${r.path.padEnd(w)}  ${r.note}`.trimEnd())
    .join('\n');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

// Serves a directory on an ephemeral 127.0.0.1 port. "/x" falls back to "/x.html" and "/x/index.html".
async function serveDir(dir) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const rel = path.normalize(decodeURIComponent((req.url ?? '/').split('?')[0]));
    const base = path.join(root, rel);
    const file = [base, base + '.html', path.join(base, 'index.html')].find(
      (c) => (c === root || c.startsWith(root + path.sep)) && fs.existsSync(c) && fs.statSync(c).isFile(),
    );
    const target = file ?? path.join(root, '404.html');
    const exists = fs.existsSync(target);
    res.writeHead(file ? 200 : 404, { 'content-type': exists ? (TYPES[path.extname(target)] ?? 'application/octet-stream') : 'text/plain' });
    if (exists) fs.createReadStream(target).pipe(res);
    else res.end('Not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function main() {
  let base = process.argv[2] || process.env.HEALTH_URL;
  let served;
  if (!base) {
    if (!fs.existsSync('dist')) {
      console.error('healthcheck: no URL given (argument or HEALTH_URL) and dist/ does not exist. Run npm run build first.');
      process.exit(1);
    }
    served = await serveDir('dist');
    base = served.url;
  }
  try {
    new URL(base);
  } catch {
    console.error(`healthcheck: "${base}" is not a valid URL`);
    process.exit(1);
  }
  const headersFile = ['dist/_headers', 'public/_headers'].find((f) => fs.existsSync(f));
  console.log(`healthcheck: ${base}${isLocal(base) ? ' (local, security headers not checked)' : ''}`);
  const { rows, failures } = await runHealthcheck(base, { headersFile });
  console.log(formatTable(rows));
  await served?.close();
  if (failures.length) {
    const cls = CLASSES.find((c) => failures.some((f) => f.class === c));
    const first = failures.find((f) => f.class === cls);
    console.error(`healthcheck FAILED (${cls}): ${first.path} ${first.note}. ${failures.length} of ${rows.length} checks failed.`);
    process.exit(1);
  }
  console.log(`healthcheck passed: ${rows.length} checks`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

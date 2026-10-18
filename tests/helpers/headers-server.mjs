// Test helper: serves a built directory with the rules of its _headers file applied.
// Supports the Cloudflare Pages subset the site uses: path rules with "*" splats, "Name: value"
// lines (repeated values are joined with ", ") and "! Name" detach lines.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
};

export function parseHeaders(text) {
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      rules.push({ pattern: raw.trim(), set: [], detach: [] });
      continue;
    }
    const rule = rules[rules.length - 1];
    const line = raw.trim();
    if (line.startsWith('!')) rule.detach.push(line.slice(1).trim().toLowerCase());
    else {
      const i = line.indexOf(':');
      rule.set.push([line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

const matches = (pattern, urlPath) =>
  new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(urlPath);

export function headersFor(rules, urlPath) {
  const out = new Map();
  for (const rule of rules) {
    if (!matches(rule.pattern, urlPath)) continue;
    for (const name of rule.detach) out.delete(name);
    for (const [name, value] of rule.set) out.set(name, out.has(name) ? `${out.get(name)}, ${value}` : value);
  }
  return Object.fromEntries(out);
}

function find(root, urlPath) {
  const base = path.join(root, path.normalize(decodeURIComponent(urlPath)));
  if (base !== root && !base.startsWith(root + path.sep)) return null;
  for (const c of [base, base + '.html', path.join(base, 'index.html')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

// Starts the server on an ephemeral port (no fixed-port clashes between parallel runs).
export async function startHeadersServer(dir = 'dist') {
  const root = path.resolve(dir);
  const rules = parseHeaders(fs.readFileSync(path.join(root, '_headers'), 'utf8'));
  const server = http.createServer((req, res) => {
    const urlPath = (req.url ?? '/').split('?')[0].split('#')[0];
    const file = find(root, urlPath);
    const target = file ?? path.join(root, '404.html');
    const exists = fs.existsSync(target);
    res.writeHead(file ? 200 : 404, {
      ...headersFor(rules, urlPath),
      'content-type': exists ? (types[path.extname(target)] ?? 'application/octet-stream') : 'text/plain',
    });
    if (exists) fs.createReadStream(target).pipe(res);
    else res.end('Not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

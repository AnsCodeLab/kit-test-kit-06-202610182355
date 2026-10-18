// Minimal static file server for CI and QA. Usage: node serve.mjs <dir> <port>
// Serves <dir> on 127.0.0.1 only. "/x" falls back to "/x.html" and "/x/index.html".
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

function resolve(urlPath) {
  const rel = path.normalize(decodeURIComponent(urlPath.split('?')[0].split('#')[0])).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(root, rel);
  if (!base.startsWith(root)) return null;
  for (const c of [base, base + '.html', path.join(base, 'index.html')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

http.createServer((req, res) => {
  let file;
  try { file = resolve(req.url || '/'); } catch { file = null; }
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>404</title><h1>404 Not Found</h1>');
    return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));

// Lists every built page (relative URL path) found in dist/.
import fs from 'node:fs';
import path from 'node:path';

export function builtPages(dist = 'dist') {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const rel = path.relative(dist, p).split(path.sep).join('/');
        if (rel === '404.html') continue;
        out.push(rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '').replace(/\.html$/, ''));
      }
    }
  };
  walk(dist);
  return out.sort();
}

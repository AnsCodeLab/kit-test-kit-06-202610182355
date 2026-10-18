// The page list for the regression suite: every URL in dist/sitemap.xml, every page found in dist/, plus 404.
import fs from 'node:fs';
import { builtPages } from '../../scripts/pages.mjs';

export function sitemapPaths(dist = 'dist'): string[] {
  const xml = fs.readFileSync(`${dist}/sitemap.xml`, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).sort();
}

export function distPaths(dist = 'dist'): string[] {
  return builtPages(dist).map((p) => (p === '/' ? '/' : p + '/'));
}

// Sitemap and dist/ must agree; the suite then audits their union.
export function allPaths(): string[] {
  return [...new Set([...sitemapPaths(), ...distPaths()])].sort();
}

// Not in dist/ as a route, so the static host answers it with the 404 page.
export const NOT_FOUND_PATH = '/regression-no-such-page/';

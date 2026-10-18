// Builds sitemap.xml content from the pages found in a built dist/ directory.
import { builtPages } from './pages.mjs';

// Clearly marked placeholder origin, used when SITE_URL is not set. Documented in the README.
export const PLACEHOLDER_SITE_URL = 'https://example.invalid';

export function siteUrl(env = process.env) {
  const raw = (env.SITE_URL || PLACEHOLDER_SITE_URL).trim();
  return raw.replace(/\/+$/, '');
}

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function sitemapXml(dist = 'dist', env = process.env) {
  const origin = siteUrl(env);
  const urls = builtPages(dist).map((p) => (p === '/' ? `${origin}/` : `${origin}${p}/`));
  const entries = urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

// Points the Sitemap line of public/robots.txt at the configured origin.
export function robotsTxt(text, env = process.env) {
  return text.replace(/^Sitemap:.*$/m, () => `Sitemap: ${siteUrl(env)}/sitemap.xml`);
}

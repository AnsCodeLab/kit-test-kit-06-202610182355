import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sitemapXml, robotsTxt, siteUrl, PLACEHOLDER_SITE_URL } from '../../scripts/sitemap.mjs';

function dist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  fs.mkdirSync(path.join(dir, 'docs'));
  for (const f of ['index.html', '404.html', 'docs/index.html']) fs.writeFileSync(path.join(dir, f), '');
  return dir;
}

describe('sitemap', () => {
  it('defaults to the placeholder origin and strips trailing slashes', () => {
    expect(siteUrl({})).toBe(PLACEHOLDER_SITE_URL);
    expect(siteUrl({ SITE_URL: 'https://a.test//' })).toBe('https://a.test');
  });
  it('lists absolute urls for built pages and leaves out 404', () => {
    const xml = sitemapXml(dist(), { SITE_URL: 'https://a.test' });
    expect(xml).toContain('<loc>https://a.test/</loc>');
    expect(xml).toContain('<loc>https://a.test/docs/</loc>');
    expect(xml).not.toContain('404');
  });
  it('rewrites the robots Sitemap line', () => {
    const out = robotsTxt('User-agent: *\nAllow: /\nSitemap: https://x.invalid/sitemap.xml\n', { SITE_URL: 'https://a.test' });
    expect(out).toContain('Sitemap: https://a.test/sitemap.xml');
    expect(out).toContain('Allow: /');
  });
});

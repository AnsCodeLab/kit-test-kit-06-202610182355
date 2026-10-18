import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { sitemapXml, robotsTxt } from './scripts/sitemap.mjs';

// With KIT_FIXTURE=1 the component fixture page is added. It is only built by
// `npm run build:fixture` into dist-fixture/, never into dist/.
const fixture = {
  name: 'component-fixture',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (process.env.KIT_FIXTURE === '1') {
        injectRoute({ pattern: '/fixture/components', entrypoint: './src/fixtures/components.astro' });
      }
    },
  },
};

// Writes sitemap.xml into the build output. Origin comes from SITE_URL (see README).
const sitemap = {
  name: 'sitemap',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemapXml(out));
      const robots = path.join(out, 'robots.txt');
      if (fs.existsSync(robots)) fs.writeFileSync(robots, robotsTxt(fs.readFileSync(robots, 'utf8')));
    },
  },
};

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  // The CSP forbids inline script and style, so every stylesheet and script is emitted as a hashed file.
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [fixture, sitemap],
});

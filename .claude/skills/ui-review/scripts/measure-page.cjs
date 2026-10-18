// usage: node measure-page.cjs <url> <viewportWidth>
// Prints one JSON line: { axe, contrastFails, smallTargets, overflow, consoleErrors, brokenLinks }
// Needs playwright-core and @axe-core/playwright resolvable from where it runs (NODE_PATH or a local node_modules),
// and a Chromium: set CHROME to its path. Exit code 2 and a message on stderr if a module or browser is missing.
const { chromium } = require('playwright-core');
let AxeBuilder;
try { ({ AxeBuilder } = require('@axe-core/playwright')); } catch (e) { process.stderr.write('measure-page: @axe-core/playwright not found: ' + e.message + '\n'); process.exit(2); }

async function measurePage(page, url, width) {
  let consoleErrors = 0;
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
  page.on('pageerror', () => { consoleErrors++; });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  const axeResult = await new AxeBuilder({ page }).analyze();
  const nodes = (v) => v.reduce((n, r) => n + r.nodes.length, 0);
  const contrastFails = nodes(axeResult.violations.filter((v) => v.id === 'color-contrast'));
  const dom = await page.evaluate(() => {
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[tabindex]:not([tabindex="-1"])';
    const inlineInText = (el) => getComputedStyle(el).display === 'inline'
      && [...el.parentNode.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const small = [...document.querySelectorAll(sel)].filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
      if (inlineInText(el)) return false;
      return r.width < 44 || r.height < 44;
    }).length;
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => /^https?:/.test(h));
    return { small, overflow: document.documentElement.scrollWidth > window.innerWidth, hrefs: [...new Set(hrefs)] };
  });
  let brokenLinks = 0;
  for (const h of dom.hrefs) {
    const status = await page.request.get(h, { failOnStatusCode: false }).then((r) => r.status(), () => 0);
    if (status === 0 || status >= 400) brokenLinks++;
  }
  return { axe: nodes(axeResult.violations), contrastFails, smallTargets: dom.small, overflow: dom.overflow, consoleErrors, brokenLinks };
}

module.exports = { measurePage };

if (require.main === module) {
  (async () => {
    const [url, w] = process.argv.slice(2);
    if (!url || !w) { process.stderr.write('usage: node measure-page.cjs <url> <viewportWidth>\n'); process.exit(1); }
    const b = await chromium.launch({ executablePath: process.env.CHROME });
    try {
      const page = await (await b.newContext()).newPage();
      process.stdout.write(JSON.stringify(await measurePage(page, url, Number(w))) + '\n');
    } finally { await b.close(); }
  })().catch((e) => { process.stderr.write('measure-page: ' + e.message + '\n'); process.exit(1); });
}

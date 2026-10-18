// Screenshot pages at three viewports and dump their visible links and the narrow-screen layout facts. Usage:
//   NODE_PATH=<dir with playwright> node shoot.cjs <baseUrl> <outDir> <path> [<path>...]
// Per page, <name> is the path with "/" replaced by "_" (the root page is "_root"):
//   <name>-desktop-01.png ..., <name>-tablet-01.png ... and <name>-mobile-01.png ...   full-page screenshots at 1440, 768 and
//        375 px wide, cut into tiles of about TILE_PX height (page capped at MAX_HEIGHT px; at most 6 tiles at 1440 and 375 px,
//        at most 4 at 768 px) so an image reader can see every part at full resolution. Tile 01 is the top of the page.
//   <name>.links.txt   HTTP status and "link text -> resolved href" for every link (desktop render)
//   <name>.meta.json   {path, status, desktop:{width, pageHeight, tiles, truncated}, tablet:{...same, facts}, mobile:{...same, facts}}
//        where facts are the layout facts from mobile-facts.cjs measured at that width (horizontal overflow, clipped text).
const fs = require('node:fs');
const path = require('node:path');
const mobileFacts = require('./mobile-facts.cjs');

// The three widths of the PRD's quality bar. No isMobile: a phone without <meta name=viewport> would lay out at 980 px;
// QA wants the real 375 px layout, as measureSite does. `facts`: measure overflow and clipped text at this width.
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, maxTiles: 6 },
  { label: 'tablet', width: 768, height: 1024, maxTiles: 4, facts: true },
  { label: 'mobile', width: 375, height: 812, maxTiles: 6, facts: true },
];
const MAX_HEIGHT = 9000;
const TILE_PX = 1600;
const MAX_TILES = 6;

/** Tile plan for a page of `height` px: {height: capped height, tiles: n, tileHeight, truncated}. Pure. */
function tilePlan(height, maxTiles = MAX_TILES) {
  const capped = Math.min(Math.max(1, Math.ceil(height)), MAX_HEIGHT);
  const tiles = Math.min(maxTiles, Math.max(1, Math.ceil(capped / TILE_PX)));
  // A page that needs more tiles than allowed is cut off after the last tile instead of being squeezed into huge images.
  const cut = Math.min(capped, tiles * TILE_PX);
  const shown = tiles === maxTiles && capped > cut ? cut : capped;
  return { height: shown, tiles, tileHeight: Math.ceil(shown / tiles), truncated: height > shown };
}

async function main() {
  const { chromium } = require('playwright'); // loaded here so tilePlan can be required without Playwright
  const [base, outDir, ...paths] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const p of paths) {
    const name = p === '/' ? '_root' : p.replace(/\//g, '_');
    const meta = { path: p, status: null };
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const resp = await page.goto(base + p, { waitUntil: 'networkidle' });
      if (vp.label === 'desktop') {
        meta.status = resp ? resp.status() : null;
        const links = await page.$$eval('a[href]', (as) =>
          as.map((a) => `${(a.textContent || '').trim().replace(/\s+/g, ' ')} -> ${a.href}`));
        fs.writeFileSync(path.join(outDir, `${name}.links.txt`),
          `page ${p} (HTTP ${meta.status ?? 'n/a'}), links:\n${links.join('\n') || '(none)'}\n`);
      }
      const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
      const plan = tilePlan(total, vp.maxTiles);
      for (let i = 0; i < plan.tiles; i++) {
        const y = i * plan.tileHeight;
        const h = Math.min(plan.tileHeight, plan.height - y);
        if (h <= 0) break;
        await page.screenshot({
          path: path.join(outDir, `${name}-${vp.label}-${String(i + 1).padStart(2, '0')}.png`),
          fullPage: true, clip: { x: 0, y, width: vp.width, height: h },
        });
      }
      const entry = { width: vp.width, pageHeight: Math.ceil(total), tiles: plan.tiles, truncated: plan.truncated };
      if (vp.facts) entry.facts = await page.evaluate(mobileFacts);
      meta[vp.label] = entry;
      await ctx.close();
    }
    fs.writeFileSync(path.join(outDir, `${name}.meta.json`), JSON.stringify(meta, null, 2) + '\n');
    console.log(`shot ${p} -> desktop ${meta.desktop.tiles}, tablet ${meta.tablet.tiles}, mobile ${meta.mobile.tiles} tiles; overflow at 768: ${meta.tablet.facts.overflowX}, at 375: ${meta.mobile.facts.overflowX}`);
  }
  await browser.close();
}

module.exports = { tilePlan, VIEWPORTS, MAX_HEIGHT, TILE_PX, MAX_TILES };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

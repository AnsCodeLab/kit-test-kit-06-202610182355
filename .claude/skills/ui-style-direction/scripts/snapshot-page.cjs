// usage: node snapshot-page.cjs <url> > snapshot.json   (needs playwright-core and a Chromium; set CHROME to its path)
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(process.argv[2], { waitUntil: 'networkidle' });
  const snap = await p.evaluate(() => {
    const kindOf = (el, i, n) => {
      const t = (el.id + ' ' + el.className + ' ' + (el.querySelector('h1,h2,h3')?.textContent ?? '')).toLowerCase();
      if (i === 0 || el.querySelector('h1')) return 'hero';
      if (el.tagName === 'FOOTER' || i === n - 1 && /footer/.test(t)) return 'footer';
      if (/install|get started|copy/.test(t) && el.querySelector('code,pre')) return 'install';
      if (/offer|pricing|plan|services/.test(t)) return 'offer';
      if (/step|how it works|flow/.test(t)) return 'steps';
      if (el.querySelector('[role=tablist],[role=tab]')) return 'tabs';
      if (/fact|trust|licen[cs]e|works with/.test(t)) return 'facts';
      return 'other';
    };
    const secs = [...document.querySelectorAll('main > section, main > div > section, body > footer')];
    const sections = secs.map((el, i) => ({ kind: kindOf(el, i, secs.length),
      cards: el.querySelectorAll('[class*=card]').length, iconCards: [...el.querySelectorAll('[class*=card]')].filter((c) => c.querySelector('svg,img')).length }));
    const bg = (e) => getComputedStyle(e).backgroundImage;
    const hero = document.querySelector('main section') ?? document.body;
    const labels = [...document.querySelectorAll('a[class*=btn],button[class*=btn],a[class*=button]')].map((a) => a.textContent.trim()).filter(Boolean);
    const hues = {};
    const hueOf = (c) => { const m = c.match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return null; const [r, g, bl] = m.map(Number).map((v) => v / 255); const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); if (mx - mn < 0.15) return null; const d = mx - mn; let h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; return Math.round(((h * 60) + 360) % 360 / 30) * 30; };
    for (const e of document.querySelectorAll('a,button,svg,[class*=eyebrow],[class*=tag]')) { const h = hueOf(getComputedStyle(e).color); if (h !== null) (hues[h] ??= []).push(e.tagName.toLowerCase()); }
    return { sections,
      hero: { hasGlow: /radial-gradient|blur/.test(bg(hero)) || /radial-gradient/.test(bg(document.body)), hasTerminalCard: !!hero.querySelector('pre,code') },
      chips: [...document.querySelectorAll('*')].filter((e) => parseFloat(getComputedStyle(e).borderRadius) >= 999 && e.textContent.trim().length > 1 && e.children.length === 0).length,
      ctaLabels: labels,
      accentBorderCards: [...document.querySelectorAll('[class*=card]')].filter((c) => parseFloat(getComputedStyle(c).borderTopWidth) >= 3 || parseFloat(getComputedStyle(c).borderLeftWidth) >= 3).length,
      hueRoles: hues,
      centredBand: !![...document.querySelectorAll('section')].slice(-2).find((s) => getComputedStyle(s).textAlign === 'center' && s.querySelector('a[class*=btn]')) };
  });
  process.stdout.write(JSON.stringify(snap, null, 1));
  await b.close();
})();

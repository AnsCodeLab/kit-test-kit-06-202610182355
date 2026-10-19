import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { builtPages } from '../../scripts/pages.mjs';
import { auditPages } from '../../scripts/audit-pages.mjs';

// The sweep runs at the two widths the ticket names; the 768 px project adds nothing here.
test.skip(({ viewport }) => viewport?.width === 768, 'contrast sweep runs at 375 and 1440 px');

for (const route of builtPages()) {
  test(`axe color-contrast: no violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
    expect(results.passes.length + results.incomplete.length).toBeGreaterThan(0);
  });
}

type Rgba = [number, number, number, number];
type Sample = { label: string; fg: Rgba; bg: Rgba; outerBg: Rgba; outline: { style: string; width: number; color: Rgba } };

// Runs in the browser: resolves the colours of one element in its current state.
function measure(el: Element): Sample {
  const parse = (c: string): Rgba => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const p = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const over = (top: Rgba, under: Rgba): Rgba => {
    const a = top[3] + under[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    const ch = (i: number) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
    return [ch(0), ch(1), ch(2), a];
  };
  // Background: composite every ancestor background down to the canvas (white).
  // The focus ring is drawn outside the element, so it is judged against the background around it.
  const stack = (from: Element | null): Rgba => {
    const chain: Rgba[] = [];
    for (let n = from; n; n = n.parentElement) chain.push(parse(getComputedStyle(n).backgroundColor));
    return chain.reverse().reduce((under, layer) => over(layer, under), [255, 255, 255, 1] as Rgba);
  };
  const bg = stack(el);
  const outerBg = stack(el.parentElement);
  const s = getComputedStyle(el);
  const fg = over(parse(s.color), bg);
  return {
    label: `<${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''}> "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`,
    fg,
    bg,
    outerBg,
    outline: { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: over(parse(s.outlineColor), outerBg) },
  };
}

const lum = ([r, g, b]: Rgba) => {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
const ratio = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// One representative per distinct look: same tag, classes and enclosing component classes.
async function distinctTargets(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const seen = new Set<string>();
    const picks: number[] = [];
    const els = [...document.querySelectorAll<HTMLElement>('a[href], button')];
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (!el.checkVisibility({ visibilityProperty: true }) || (r.width === 0 && r.height === 0)) return;
      const ctx: string[] = [];
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) ctx.push(n.tagName + '.' + n.className);
      const key = ctx.slice(0, 4).join('>');
      if (seen.has(key)) return;
      seen.add(key);
      picks.push(i);
    });
    return picks;
  });
}

for (const route of auditPages) {
  test(`state contrast of links and buttons on ${route}`, async ({ page }) => {
    await page.goto(route);
    const picks = await distinctTargets(page);
    expect(picks.length).toBeGreaterThan(0);
    const all = page.locator('a[href], button');
    const failures: string[] = [];

    for (const i of picks) {
      const el = all.nth(i);
      await el.scrollIntoViewIfNeeded();
      const check = async (state: string, textMin: number, needOutline: boolean) => {
        const s = (await el.evaluate(measure)) as Sample;
        const text = ratio(s.fg, s.bg);
        if (text < textMin) failures.push(`${state} ${s.label}: text ${text.toFixed(2)}:1 < ${textMin}`);
        if (needOutline) {
          if (s.outline.style === 'none' || s.outline.width < 2) failures.push(`${state} ${s.label}: no focus indicator`);
          else {
            const ind = ratio(s.outline.color, s.outerBg);
            if (ind < 3) failures.push(`${state} ${s.label}: indicator ${ind.toFixed(2)}:1 < 3`);
          }
        }
      };

      // The skip link sits off screen until it is focused, so only its focus state is reachable.
      const offscreen = await el.evaluate((n) => n.classList.contains('skip-link'));
      if (!offscreen) await page.mouse.move(0, 0);
      if (!offscreen) await check('rest', 4.5, false);

      if (!offscreen) await el.hover();
      if (!offscreen) await check('hover', 4.5, false);

      // Active: press, measure, then move off the element before releasing so nothing navigates.
      const box = offscreen ? null : await el.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await check('active', 4.5, false);
        await page.mouse.move(0, 0);
        await page.mouse.up();
      }

      // A key press first makes Chromium treat the focus as keyboard focus (:focus-visible).
      await page.keyboard.press('Shift');
      await el.focus();
      await check('focus-visible', 4.5, true);
      await el.evaluate((n) => (n as HTMLElement).blur());
    }
    expect(failures).toEqual([]);
  });
}

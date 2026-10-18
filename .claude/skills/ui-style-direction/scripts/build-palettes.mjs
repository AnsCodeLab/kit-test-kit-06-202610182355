#!/usr/bin/env node
// Regenerates references/palettes.json from the Tailwind v3 scales (MIT) and the combination table below.
// Every ratio is computed here; steps are chosen by search so no stored text pair fails WCAG AA.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ratio, cvdDistinct, isGreenFamily } from './palette-lib.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, '../references/tailwind-v3-colors.json'), 'utf8'));
const W = '#FFFFFF';
const S = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
// [feel, neutral, accent, second, use_when, not_when]
const TABLE = {
  calm: [
    ['slate', 'sky', 'amber'], ['stone', 'teal', 'pink'], ['gray', 'cyan', 'orange'], ['slate', 'blue', 'yellow'], ['zinc', 'teal', 'red'],
    ['neutral', 'sky', 'pink'], ['stone', 'blue', 'orange'], ['gray', 'teal', 'rose'], ['slate', 'cyan', 'rose'], ['zinc', 'sky', 'orange'],
  ],
  editorial: [
    ['stone', 'red', 'teal'], ['neutral', 'rose', 'sky'], ['stone', 'orange', 'blue'], ['zinc', 'red', 'blue'], ['stone', 'amber', 'purple'],
    ['neutral', 'pink', 'teal'], ['gray', 'red', 'cyan'], ['stone', 'yellow', 'blue'], ['slate', 'rose', 'purple'], ['neutral', 'orange', 'cyan'],
  ],
  bold: [
    ['zinc', 'blue', 'yellow'], ['neutral', 'red', 'sky'], ['zinc', 'fuchsia', 'yellow'], ['neutral', 'orange', 'blue'], ['zinc', 'pink', 'cyan'],
    ['zinc', 'purple', 'orange'], ['neutral', 'rose', 'purple'], ['zinc', 'cyan', 'orange'], ['neutral', 'red', 'cyan'], ['zinc', 'violet', 'amber'],
  ],
  warm: [
    ['stone', 'orange', 'sky'], ['stone', 'red', 'blue'], ['stone', 'rose', 'cyan'], ['neutral', 'amber', 'purple'], ['stone', 'orange', 'blue'],
    ['stone', 'pink', 'teal'], ['stone', 'yellow', 'purple'], ['neutral', 'rose', 'cyan'], ['stone', 'red', 'sky'], ['stone', 'amber', 'purple'],
  ],
  technical: [
    ['slate', 'blue', 'amber'], ['zinc', 'cyan', 'orange'], ['slate', 'sky', 'pink'], ['gray', 'blue', 'yellow'], ['zinc', 'indigo', 'amber'],
    ['slate', 'cyan', 'rose'], ['gray', 'sky', 'orange'], ['zinc', 'blue', 'amber'], ['slate', 'violet', 'yellow'], ['gray', 'teal', 'rose'],
  ],
};
const USE = {
  calm: ['quiet product pages and documentation where reading comes first', 'loud or playful brands'],
  editorial: ['story-led pages, long-form docs, magazine-like layouts', 'dense dashboards'],
  bold: ['launch pages and brands that want a strong first impression', 'conservative buyers, long reading'],
  warm: ['friendly, human products and services', 'cold technical or security positioning'],
  technical: ['developer tools, APIs, CLI-first products', 'consumer lifestyle brands'],
};
const hex = (h, s) => T[h][s].toUpperCase();
const firstStep = (hue, steps, bg, need, extra = []) => { for (const s of steps) { const c = hex(hue, s); if (ratio(c, bg) >= need && extra.every((b) => ratio(c, b) >= need)) return { c, s }; } return null; };
const out = [];
for (const [feel, rows] of Object.entries(TABLE)) rows.forEach(([n, a, s2], i) => {
  const bg = hex(n, '50'), surface = W, text = hex(n, '900'), muted = hex(n, '600');
  const border = firstStep(n, ['300', '400', '500', '600'], bg, 3) || { c: hex(n, '600'), s: '600' };
  const acc = firstStep(a, ['600', '700', '800', '900'], bg, 4.5, [surface]);
  const sec = firstStep(s2, ['600', '700', '800', '900'], bg, 4.5, [surface]);
  const dbg = hex(n, '950'), dtext = hex(n, '100');
  const dacc = firstStep(a, ['400', '300', '200'], dbg, 7), dsec = firstStep(s2, ['400', '300', '200'], dbg, 4.5);
  const onAcc = ratio(W, acc.c) >= 4.5 ? W : hex(n, '950');
  const checks = {
    text_on_bg: ratio(text, bg), muted_on_bg: ratio(muted, bg), accent_on_bg: ratio(acc.c, bg), on_accent: ratio(onAcc, acc.c),
    second_on_bg: ratio(sec.c, bg), border_on_bg: ratio(border.c, bg),
    text_on_dark: ratio(dtext, dbg), accent_on_dark: ratio(dacc.c, dbg), second_on_dark: ratio(dsec.c, dbg),
  };
  const cvd = { deuteranopia: cvdDistinct(acc.c, sec.c, 'deuteranopia'), protanopia: cvdDistinct(acc.c, sec.c, 'protanopia') };
  const fails = [];
  for (const [k, need] of [['text_on_bg', 4.5], ['muted_on_bg', 4.5], ['accent_on_bg', 4.5], ['on_accent', 4.5], ['second_on_bg', 4.5], ['border_on_bg', 3], ['text_on_dark', 4.5], ['accent_on_dark', 4.5], ['second_on_dark', 4.5]]) if (checks[k] < need) fails.push({ pair: k, ratio: checks[k], needs: need });
  for (const k of Object.keys(cvd)) if (!cvd[k].distinct) fails.push({ pair: `${k}_accent_vs_second`, ratio: cvd[k].contrast, needs: 'distinct by lightness (1.4) or hue gap (40 degrees)' });
  const flags = [];
  if (['indigo', 'violet', 'purple'].includes(a) && feel === 'technical') flags.push('generic developer-tool hue: write a reason before using it');
  if (a === 'blue' && s2 === 'orange') flags.push('blue plus orange CTA pair, the category default');
  if (isGreenFamily(acc.c) || isGreenFamily(sec.c)) flags.push('green family');
  out.push({
    id: `${feel}-${n}-${a}-${s2}`, name: `${n[0].toUpperCase() + n.slice(1)}, ${a}, ${s2}`, feel,
    source: { scales: 'tailwindcss v3.4.17 default colours', license: 'MIT', steps: { accent: acc.s, second: sec.s, accent_dark: dacc.s, second_dark: dsec.s } },
    light: { bg, surface, text, muted, border: border.c, accent: acc.c, on_accent: onAcc, second: sec.c },
    dark: { bg: dbg, text: dtext, accent: dacc.c, second: dsec.c },
    checks, cvd: Object.fromEntries(Object.entries(cvd).map(([k, v]) => [k, { simulated: v.simulated, contrast: v.contrast, hue_gap: v.hueGap, distinct: v.distinct }])),
    fails, flags, use_when: USE[feel][0], not_when: USE[feel][1],
    second_role: 'marks state and emphasis (current page, tags, highlights), not primary actions',
  });
});
writeFileSync(join(here, '../references/palettes.json'), JSON.stringify({ version: 1, generated_from: 'scripts/build-palettes.mjs', palettes: out }, null, 1) + '\n');
console.log(`${out.length} palettes; with fails: ${out.filter((p) => p.fails.length).length}; with flags: ${out.filter((p) => p.flags.length).length}`);

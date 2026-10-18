#!/usr/bin/env node
// Usage: node check-palette.mjs <bg> <text> <accent> [second] [border]
// Prints WCAG contrast ratios and colour-blindness checks for a hex palette.
import { ratio, cvdDistinct, isGreenFamily } from './palette-lib.mjs';
const [bg, text, accent, second, border] = process.argv.slice(2);
if (!bg || !text || !accent) { console.error('usage: check-palette.mjs <bg> <text> <accent> [second] [border]'); process.exit(2); }
const rows = [['text on bg (>=4.5)', text, bg, 4.5], ['accent on bg (>=4.5 as text)', accent, bg, 4.5]];
if (second) rows.push(['second on bg (>=4.5 as text)', second, bg, 4.5]);
if (border) rows.push(['border on bg (>=3 for UI parts)', border, bg, 3]);
let bad = 0;
for (const [n, a, b, need] of rows) { const r = ratio(a, b); const ok = r >= need; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}: ${a} on ${b} = ${r}`); }
if (second) for (const k of ['deuteranopia', 'protanopia']) { const d = cvdDistinct(accent, second, k); console.log(`${d.distinct ? 'PASS' : 'FAIL'}  ${k}: accent vs second -> ${d.simulated.join(' / ')} (contrast ${d.contrast}, hue gap ${d.hueGap})`); if (!d.distinct) bad++; }
for (const [n, c] of [['accent', accent], ['second', second]]) if (c && isGreenFamily(c)) console.log(`NOTE  ${n} ${c} is in the green family`);
process.exit(bad ? 1 : 0);

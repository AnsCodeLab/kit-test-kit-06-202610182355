// Contrast and colour-blindness maths shared by check-palette.mjs and build-palettes.mjs.
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => { const x = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
export const lum = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const M = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export const simulate = (hex, kind) => {
  const v = rgb(hex).map(lin);
  const o = M[kind].map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
  return '#' + o.map((c) => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
export const hueDeg = (hex) => {
  const [r, g, b] = rgb(hex).map((c) => c / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (Math.round(h * 60) + 360) % 360;
};
const hueGap = (a, b) => { const d = Math.abs(hueDeg(a) - hueDeg(b)); return Math.min(d, 360 - d); };
// Two colours stay distinguishable under a colour-vision deficiency if they differ in lightness or hue.
export const cvdDistinct = (a, b, kind) => {
  const sa = simulate(a, kind), sb = simulate(b, kind);
  const c = ratio(sa, sb), hg = hueGap(sa, sb);
  return { simulated: [sa, sb], contrast: c, hueGap: hg, distinct: c >= 1.4 || hg >= 40 };
};
export const isGreenFamily = (hex) => { const [r, g, b] = rgb(hex); const h = hueDeg(hex); return h >= 75 && h <= 165 && g > r && g >= b && g - Math.min(r, b) > 20; };

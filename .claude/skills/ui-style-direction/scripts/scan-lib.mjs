// Pure functions over a page snapshot (see snapshot-page.cjs). No browser, no network.
export const DEFAULT_TEMPLATE = ['hero', 'facts', 'tabs', 'steps', 'install', 'offer', 'footer'];

export function scanTells(s) {
  const dupes = (() => { const seen = new Map(); for (const l of s.ctaLabels ?? []) seen.set(l, (seen.get(l) ?? 0) + 1); return [...seen.values()].some((n) => n > 1); })();
  const roles = Object.values(s.hueRoles ?? {});
  const tells = {
    glow: s.hero?.hasGlow ? 1 : 0,
    chips: (s.chips ?? 0) >= 4 ? 1 : 0,
    iconCards: (s.sections ?? []).some((x) => (x.iconCards ?? 0) >= 3) ? 1 : 0,
    centredBand: s.centredBand ? 1 : 0,
    duplicateCta: dupes ? 1 : 0,
    accentBorders: (s.accentBorderCards ?? 0) >= 3 ? 1 : 0,
    oneHueJobs: roles.length === 1 && roles[0].length >= 4 ? 1 : 0,
  };
  return { tells, total: Object.values(tells).reduce((a, b) => a + b, 0) };
}

export function checkStructure(s, template = DEFAULT_TEMPLATE) {
  const sequence = (s.sections ?? []).map((x) => x.kind);
  const filtered = sequence.filter((k) => k !== 'other');
  const breaks = [];
  for (const k of template) if (!filtered.includes(k)) breaks.push(`dropped:${k}`);
  const present = template.filter((k) => filtered.includes(k));
  const order = filtered.filter((k) => present.includes(k));
  for (const k of present) if (order.indexOf(k) !== present.indexOf(k) && !breaks.includes(`moved:${k}`)) breaks.push(`moved:${k}`);
  // report only the section that moved furthest, so one swap is one break
  const moved = breaks.filter((b) => b.startsWith('moved:'));
  const kept = breaks.filter((b) => !b.startsWith('moved:'));
  const one = moved.length ? [moved.sort((a, b) => Math.abs(order.indexOf(b.slice(6)) - present.indexOf(b.slice(6))) - Math.abs(order.indexOf(a.slice(6)) - present.indexOf(a.slice(6))))[0]] : [];
  const out = [...kept, ...one];
  return { sequence, breaks: out, ok: out.length >= 1 };
}

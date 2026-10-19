import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8');
const doc = fs.readFileSync('docs/design-direction.md', 'utf8');

function token(name: string): string {
  const m = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a 6-digit hex colour in tokens.css`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const section = doc.split(/^## Contrast pairs$/m)[1] ?? '';
const rows = [...section.matchAll(/^\|\s*`(--[\w-]+)`\s*\|\s*`(--[\w-]+)`\s*\|[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|$/gm)].map((m) => ({
  fg: m[1],
  bg: m[2],
  min: Number(m[3]),
  documented: Number(m[4]),
}));

describe('design-direction.md contrast pairs', () => {
  it('lists the pairs', () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  for (const row of rows) {
    it(`${row.fg} on ${row.bg} meets ${row.min}:1 and matches the documented value`, () => {
      const measured = ratio(token(row.fg), token(row.bg));
      expect(measured).toBeGreaterThanOrEqual(row.min);
      expect(Math.abs(measured - row.documented)).toBeLessThan(0.01);
    });
  }
});

describe('tokens.css', () => {
  it.each(['--space-1', '--radius-1', '--shadow-1', '--duration-base', '--ease-standard', '--text-base', '--color-focus'])('defines %s', (name) => {
    expect(tokens).toMatch(new RegExp(`${name}:`));
  });
});

describe('design-direction.md structure', () => {
  const directions = [...doc.matchAll(/^### Direction ([A-Z]): .+$/gm)];
  it('has at least three directions, each with a layout skeleton', () => {
    expect(directions.length).toBeGreaterThanOrEqual(3);
    for (const d of directions) {
      const body = doc.split(d[0])[1].split(/^##/m)[0];
      expect(body).toMatch(/Layout skeleton:/);
    }
  });
  it('names exactly one chosen direction', () => {
    expect(doc.match(/\*\*Direction [A-Z], [^*]+, is chosen\.\*\*/g)).toHaveLength(1);
  });
});

describe('design-direction.md Round 2', () => {
  const round2 = doc.split(/^## Round 2$/m)[1] ?? '';
  it('names at least three deviations from the category default and an accent rule', () => {
    const list = round2.split('### Deviations from the developer-tool category default')[1]?.split(/^###/m)[0] ?? '';
    expect([...list.matchAll(/^\d+\. \*\*/gm)].length).toBeGreaterThanOrEqual(3);
    expect(round2).toMatch(/### Accent usage rule/);
  });
  it('lists the new band pairs', () => {
    for (const fg of ['--color-on-band', '--color-on-band-muted', '--color-focus-on-dark']) {
      expect(rows.some((r) => r.fg === fg && r.bg === '--color-band')).toBe(true);
    }
  });
});

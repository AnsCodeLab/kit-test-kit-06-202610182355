import { describe, it, expect } from 'vitest';
import { treemap } from '../../src/lib/treemap';

describe('treemap', () => {
  const items = [
    { key: 'core', value: 19 },
    { key: 'maintenance', value: 5 },
    { key: 'architecture', value: 8 },
    { key: 'ui', value: 25 },
  ];
  const rects = treemap(items, 480, 240);

  it('gives every item a rectangle whose area is proportional to its value', () => {
    const total = items.reduce((s, i) => s + i.value, 0);
    for (const r of rects) expect((r.w * r.h) / (480 * 240)).toBeCloseTo(r.value / total, 10);
  });

  it('tiles the frame without overlap or gaps', () => {
    expect(rects.reduce((s, r) => s + r.w * r.h, 0)).toBeCloseTo(480 * 240, 6);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(480 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(240 + 1e-9);
    }
  });

  it('puts the largest items on top and drops empty ones', () => {
    expect(rects.slice(0, 2).map((r) => r.key)).toEqual(['ui', 'core']);
    expect(treemap([{ key: 'a', value: 0 }], 10, 10)).toEqual([]);
  });
});

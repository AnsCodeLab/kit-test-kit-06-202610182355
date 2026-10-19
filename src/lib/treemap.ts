export interface TreemapItem {
  key: string;
  value: number;
}
export interface TreemapRect extends TreemapItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Two-row treemap: the largest two items share the top row, the rest the bottom row. Row height follows the row's
 * share of the total and widths follow each item's share of its row, so every rectangle's area is exactly
 * proportional to its value.
 */
export function treemap(items: TreemapItem[], width: number, height: number): TreemapRect[] {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  const rows = [sorted.slice(0, 2), sorted.slice(2)].filter((r) => r.length > 0);
  const out: TreemapRect[] = [];
  let y = 0;
  for (const row of rows) {
    const rowTotal = row.reduce((s, i) => s + i.value, 0);
    const h = (height * rowTotal) / total;
    let x = 0;
    for (const item of row) {
      const w = (width * item.value) / rowTotal;
      out.push({ ...item, x, y, w, h });
      x += w;
    }
    y += h;
  }
  return out;
}

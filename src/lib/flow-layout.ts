import type { FlowData } from '../../scripts/flow-lib.mjs';

/** Everything the flow diagram draws, in viewBox units. Positions only; colours and fonts live in the stylesheet. */
export interface TextBlock {
  x: number;
  y: number;
  lines: string[];
  cls: string;
  /** Rotate -90 degrees around (x, y). */
  rotate?: boolean;
  anchor?: 'middle';
}
export interface Shape {
  kind: 'rect' | 'path';
  cls: string;
  /** rect: x, y, width, height. path: d. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  d?: string;
}
export interface Layout {
  w: number;
  h: number;
  shapes: Shape[];
  texts: TextBlock[];
}

// Glyph width as a share of the font size, kept on the wide side so wrapped lines stay inside their column
// with the real fonts and with the fallback face.
const SANS = 0.52;

export function wrap(text: string, width: number, size: number): string[] {
  const max = Math.max(8, Math.floor(width / (size * SANS)));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && `${line} ${word}`.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

const head = (x: number, y: number, dir: 'right' | 'down' | 'left' | 'up') => {
  const s = 6;
  const pts = {
    right: [[x - s, y - s], [x, y], [x - s, y + s]],
    down: [[x - s, y - s], [x, y], [x + s, y - s]],
    left: [[x + s, y - s], [x, y], [x + s, y + s]],
    up: [[x - s, y + s], [x, y], [x + s, y + s]],
  }[dir];
  return `M${pts[0].join(' ')}L${pts[1].join(' ')}L${pts[2].join(' ')}`;
};

const CHIP_W = 84;
const CHIP_H = 28;

/** Four columns left to right; the return edge runs over the top from Verify back to Plan. */
export function horizontal(flow: FlowData): Layout {
  const colW = 160;
  const gap = 26;
  const body = 14;
  const lead = 20;
  const top = 48;
  const boxH = 64;
  const x = (i: number) => i * (colW + gap);
  const w = 4 * colW + 3 * gap;
  const shapes: Shape[] = [];
  const texts: TextBlock[] = [];

  const desc = flow.stages.map((s) => wrap(s.description, colW, body));
  const gates = flow.stages.map((s) => (s.gate ? wrap(s.gate.text, colW, body) : []));
  const descTop = top + boxH + 28;
  const descEnd = descTop + Math.max(...desc.map((d) => d.length)) * lead;
  const chipY = descEnd + 8;
  const gateTop = chipY + CHIP_H + 20;
  const gateEnd = gateTop + Math.max(...gates.map((g) => g.length)) * lead;
  const bracketY = gateEnd + 6;
  const rel = wrap(flow.relation, 2 * colW + gap, body);
  const h = bracketY + 28 + rel.length * lead;

  flow.stages.forEach((s, i) => {
    shapes.push({ kind: 'rect', cls: 'shadow', x: x(i) + 3, y: top + 3, w: colW, h: boxH });
    shapes.push({ kind: 'rect', cls: 'box', x: x(i), y: top, w: colW, h: boxH });
    texts.push({ x: x(i) + 12, y: top + 24, lines: [String(s.n).padStart(2, '0')], cls: 't-num' });
    texts.push({ x: x(i) + 12, y: top + 51, lines: [s.name], cls: 't-name' });
    texts.push({ x: x(i), y: descTop, lines: desc[i], cls: 't-desc' });
    if (s.gate) {
      shapes.push({ kind: 'rect', cls: 'chip', x: x(i) + 1, y: chipY, w: CHIP_W, h: CHIP_H });
      texts.push({ x: x(i) + 1 + CHIP_W / 2, y: chipY + 19, lines: [s.gate.name], cls: 't-chip', anchor: 'middle' });
      texts.push({ x: x(i), y: gateTop, lines: gates[i], cls: 't-gate' });
    }
    if (i < 3) {
      const y = top + boxH / 2;
      shapes.push({ kind: 'path', cls: 'edge draw', d: `M${x(i) + colW + 3} ${y}H${x(i + 1) - 2}` });
      shapes.push({ kind: 'path', cls: 'head', d: head(x(i + 1) - 1, y, 'right') });
    }
  });

  // Gate Q and Gate B bracket: they run at the same time.
  const bx1 = x(2) + 1;
  const bx2 = x(3) + colW - 1;
  shapes.push({ kind: 'path', cls: 'bracket', d: `M${bx1} ${bracketY - 8}V${bracketY}H${bx2}V${bracketY - 8}` });
  texts.push({ x: x(2), y: bracketY + 26, lines: rel, cls: 't-rel' });

  // Return edge: Verify (QA: FAIL) back to Plan.
  const from = x(2) + colW / 2;
  const to = x(0) + colW / 2;
  const ly = 22;
  shapes.push({ kind: 'path', cls: 'fail draw', d: `M${from} ${top - 2}V${ly}H${to}V${top - 10}` });
  shapes.push({ kind: 'path', cls: 'head fail-head', d: head(to, top - 2, 'down') });
  const mid = (from + to) / 2;
  shapes.push({ kind: 'rect', cls: 'label-bg', x: mid - 86, y: ly - 13, w: 172, h: 26 });
  texts.push({ x: mid, y: ly + 5, lines: [flow.failLabel], cls: 't-fail', anchor: 'middle' });
  return { w, h, shapes, texts };
}

/** One column top to bottom; the return edge runs down the right-hand side. */
export function vertical(flow: FlowData): Layout {
  const colW = 268;
  const body = 15;
  const lead = 22;
  const boxH = 56;
  const w = 322;
  const railX = 308;
  const shapes: Shape[] = [];
  const texts: TextBlock[] = [];
  let y = 4;
  const mids: number[] = [];

  flow.stages.forEach((s, i) => {
    shapes.push({ kind: 'rect', cls: 'shadow', x: 3, y: y + 3, w: colW, h: boxH });
    shapes.push({ kind: 'rect', cls: 'box', x: 0, y, w: colW, h: boxH });
    texts.push({ x: 12, y: y + 35, lines: [String(s.n).padStart(2, '0')], cls: 't-num' });
    texts.push({ x: 52, y: y + 36, lines: [s.name], cls: 't-name' });
    mids.push(y + boxH / 2);
    let cy = y + boxH + 28;
    const d = wrap(s.description, colW, body);
    texts.push({ x: 0, y: cy, lines: d, cls: 't-desc' });
    cy += d.length * lead - 4;
    if (s.gate) {
      cy += 10;
      shapes.push({ kind: 'rect', cls: 'chip', x: 1, y: cy, w: CHIP_W, h: CHIP_H });
      texts.push({ x: 1 + CHIP_W / 2, y: cy + 19, lines: [s.gate.name], cls: 't-chip', anchor: 'middle' });
      const g = wrap(s.gate.text, colW, body);
      texts.push({ x: 0, y: cy + CHIP_H + 22, lines: g, cls: 't-gate' });
      cy += CHIP_H + 22 + g.length * lead - 8;
    }
    if (i < 3) {
      shapes.push({ kind: 'path', cls: 'edge draw', d: `M26 ${cy + 8}V${cy + 36}` });
      shapes.push({ kind: 'path', cls: 'head', d: head(26, cy + 37, 'down') });
      y = cy + 44;
    } else y = cy;
  });

  // Gate Q and Gate B run at the same time: the relationship sentence closes the column.
  const rel = wrap(flow.relation, colW, body);
  y += 14;
  shapes.push({ kind: 'path', cls: 'bracket', d: `M1 ${y}H${colW - 1}` });
  texts.push({ x: 0, y: y + 26, lines: rel, cls: 't-rel' });
  const h = y + 26 + rel.length * lead + 4;

  // Return edge: Verify (index 2) back to Plan (index 0), on the right.
  shapes.push({ kind: 'path', cls: 'fail draw', d: `M${colW + 2} ${mids[2]}H${railX}V${mids[0]}H${colW + 8}` });
  shapes.push({ kind: 'path', cls: 'head fail-head', d: head(colW + 2, mids[0], 'left') });
  const mid = (mids[0] + mids[2]) / 2;
  shapes.push({ kind: 'rect', cls: 'label-bg', x: railX - 11, y: mid - 86, w: 22, h: 172 });
  texts.push({ x: railX + 5, y: mid, lines: [flow.failLabel], cls: 't-fail', anchor: 'middle', rotate: true });
  return { w, h, shapes, texts };
}

/** The long text alternative: every stage in order with its gate, the relationship, and the return edge. */
export function describe(flow: FlowData): string {
  const stages = flow.stages
    .map((s) => `${s.n}. ${s.name}. ${s.description}${s.gate ? ` ${s.gate.name}: ${s.gate.text}` : ''}`)
    .join(' ');
  return `${flow.stages.length} stages in order, left to right or top to bottom. ${stages} ${flow.relation} ${flow.failLabel}: a failed Gate Q returns to ${flow.stages[0].name}.`;
}

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { buildFlow, buildFlowFromContent, serializeFlow } from '../../scripts/flow-lib.mjs';
import { describe as altText, horizontal, vertical, wrap } from '../../src/lib/flow-layout';
import flow from '../../src/data/flow.json';

const chapter = fs.readFileSync('content/handbook/03-the-flow.md', 'utf8');
// The chapter in plain text: markdown bold and code marks removed, so a quoted sentence can be searched for.
const text = chapter.replace(/\*\*/g, '').replace(/`/g, '');
const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);
const quoted = (s: string) => text.includes(s) || text.includes(lowerFirst(s));

describe('flow diagram data', () => {
  it('is exactly what the sync derives from content/', () => {
    expect(fs.readFileSync('src/data/flow.json', 'utf8')).toBe(serializeFlow(buildFlowFromContent('content')));
  });

  it('shows the four stages named in the chapter title, in the chapter order', () => {
    const title = /^# \d+\. The flow: (.+)$/m.exec(chapter)![1];
    expect(flow.stages.map((s) => s.name)).toEqual(title.split(', '));
    expect(flow.stages.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    const headings = [...chapter.matchAll(/^## 3\.\d+ Stage (\d): (.+)$/gm)].map((m) => [Number(m[1]), m[2]]);
    expect(headings).toEqual(flow.stages.map((s) => [s.n, s.name]));
  });

  it('every stage description is a sentence of that stage section of the chapter', () => {
    const sections = chapter.split(/^## /m).filter((s) => /^3\.\d+ Stage/.test(s));
    flow.stages.forEach((s, i) => {
      const section = sections[i].replace(/\*\*/g, '').replace(/`/g, '');
      expect(section.includes(s.description) || section.includes(lowerFirst(s.description)), s.name).toBe(true);
    });
  });

  it('gate lines are the chapter bullets and gates sit on Plan, Verify and Cross-Review', () => {
    expect(flow.stages.map((s) => s.gate?.name)).toEqual(['Gate A', undefined, 'Gate Q', 'Gate B']);
    for (const s of flow.stages) {
      if (!s.gate) continue;
      expect(quoted(s.gate.text), s.gate.name).toBe(true);
      expect(text).toContain(`${s.gate.name} `);
    }
  });

  it('the relationship and the failure edge are in the chapter', () => {
    expect(text).toContain(flow.relation);
    expect(text).toContain(flow.failLabel);
  });

  it('fails loudly when the chapter loses a quoted sentence or a stage', () => {
    expect(() => buildFlow(chapter.replace('Fetch the ticket, plan, then', 'Get the ticket, plan, then'))).toThrow(/no longer contains/);
    expect(() => buildFlow(chapter.replace('## 3.5 Stage 4: Cross-Review', '## 3.5 Cross-Review'))).toThrow(/stage sections/);
    expect(() => buildFlow(chapter.replace('may run at the same time', 'run later'))).toThrow(/relationship/);
  });
});

describe('flow diagram layout and text alternative', () => {
  it('the text alternative carries every stage, gate, the relationship and the failure edge in order', () => {
    const alt = altText(flow);
    let at = -1;
    for (const s of flow.stages) {
      const i = alt.indexOf(`${s.n}. ${s.name}. ${s.description}`);
      expect(i, s.name).toBeGreaterThan(at);
      at = i;
      if (s.gate) expect(alt).toContain(`${s.gate.name}: ${s.gate.text}`);
    }
    expect(alt).toContain(flow.relation);
    expect(alt).toContain(flow.failLabel);
  });

  it('both layouts draw every stage name, description line and gate line', () => {
    for (const layout of [horizontal(flow), vertical(flow)]) {
      const drawn = layout.texts.map((t) => t.lines.join(' '));
      for (const s of flow.stages) {
        expect(drawn, s.name).toContain(s.name);
        expect(drawn, s.name).toContain(s.description);
        if (s.gate) expect(drawn).toContain(s.gate.text);
      }
      expect(drawn).toContain(flow.relation);
      expect(layout.texts.some((t) => t.lines[0] === flow.failLabel)).toBe(true);
    }
  });

  it('wraps words without losing or splitting any', () => {
    const lines = wrap(flow.stages[1].description, 160, 14);
    expect(lines.join(' ')).toBe(flow.stages[1].description);
    expect(lines.length).toBeGreaterThan(3);
  });
});

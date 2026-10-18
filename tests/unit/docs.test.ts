import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { renderDoc, slugify } from '../../src/lib/skill-markdown';
import { getHandbookChapters } from '../../src/lib/catalog';
import { DOC_PAGES } from '../../src/lib/docs';
import { INSTALL_COMMAND } from '../../src/lib/install';

const quickstart = fs.readFileSync('content/handbook/02-quickstart.md', 'utf8');

/** Lines of the chapter's non-diagram code fences, in order. */
function codeLines(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/^```(\S*)[^\n]*\n([\s\S]*?)^```/gm)) {
    if (m[1] === 'mermaid') continue;
    out.push(...m[2].split('\n').filter((l) => l.trim() !== ''));
  }
  return out;
}

const decode = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

describe('renderDoc on 02-quickstart.md', () => {
  const { html, headings } = renderDoc(quickstart);

  it('keeps every code-block line of the chapter verbatim', () => {
    const lines = codeLines(quickstart);
    expect(lines.length).toBeGreaterThan(10);
    const text = decode(html);
    for (const line of lines) expect(text, line).toContain(line);
  });

  it('keeps every prose paragraph of the chapter', () => {
    const prose = quickstart.replace(/^```[\s\S]*?^```/gm, '').split(/\n{2,}/).filter((b) => /^[A-Z]/.test(b.trim()) && !b.includes('|'));
    const text = decode(html).replace(/\s+/g, ' ');
    expect(prose.length).toBeGreaterThan(5);
    for (const block of prose) {
      const plain = block.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
      expect(text, plain).toContain(plain);
    }
  });

  it('includes the install command the InstallCommand component shows', () => {
    expect(codeLines(quickstart)).toContain(INSTALL_COMMAND);
  });

  it('drops the chapter h1 and starts at h2 without skipping a level', () => {
    expect(html).not.toMatch(/<h1[ >]/);
    expect(headings[0].level).toBe(2);
    headings.slice(1).forEach((h, i) => expect(h.level - headings[i].level).toBeLessThanOrEqual(1));
  });

  it('gives every heading a unique id that its element carries', () => {
    const ids = headings.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('main');
    for (const h of headings) expect(html).toContain(`<h${h.level} id="${h.id}">`);
  });

  it('lists every chapter heading', () => {
    const wanted = [...quickstart.replace(/^```[\s\S]*?^```/gm, '').matchAll(/^##+ +(.+)$/gm)].map((m) => m[1].replace(/[`*_]/g, ''));
    expect(headings.map((h) => h.text)).toEqual(wanted);
  });
});

describe('renderDoc heading ids', () => {
  it('suffixes duplicates and avoids reserved ids', () => {
    const { headings } = renderDoc('# T\n\n## Same\n\n## Same\n\n## Main\n\n### `Same`\n');
    expect(headings.map((h) => h.id)).toEqual(['same', 'same-2', 'main-2', 'same-3']);
  });

  it('never links a heading that already holds a link', () => {
    const { html } = renderDoc('# T\n\n## See [site](https://example.com)\n');
    expect(html).toContain('<h2 id="see-site">See <a href="https://example.com"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it('slugifies to a non-empty ascii id', () => {
    expect(slugify('Re-run and conflicts')).toBe('re-run-and-conflicts');
    expect(slugify('???')).toBe('section');
  });
});

describe('docs pages', () => {
  it('map to handbook chapters that exist', () => {
    const ids = getHandbookChapters().map((c) => `${String(c.order).padStart(2, '0')}-${c.slug}`);
    for (const p of DOC_PAGES) expect(ids).toContain(p.id);
  });
});

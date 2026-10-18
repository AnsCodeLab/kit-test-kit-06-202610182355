import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import {
  getAgents,
  getHandbookChapters,
  getHooks,
  getMcpServers,
  getSkillGroups,
  getSkills,
  parseChapter,
} from '../../src/lib/catalog';

const data = (file: string) => path.resolve('content/catalog-data', file);
const rawEntries = (file: string): { group?: string }[] => parse(fs.readFileSync(data(file), 'utf8'));

describe('skills', () => {
  it('returns one skill per top-level entry in skills.yaml', () => {
    expect(getSkills()).toHaveLength(rawEntries('skills.yaml').length);
  });

  it('gives every skill a non-empty id, name, group and description', () => {
    for (const skill of getSkills()) {
      for (const key of ['id', 'name', 'group', 'description'] as const) {
        expect(skill[key].trim(), `${skill.id}.${key}`).not.toBe('');
      }
    }
  });

  it('has unique ids', () => {
    const ids = getSkills().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps forced only where the data sets it', () => {
    const raw = rawEntries('skills.yaml') as { id: string; forced?: boolean }[];
    for (const skill of getSkills()) {
      expect(skill.forced).toBe(raw.find((r) => r.id === skill.id)?.forced);
    }
  });
});

describe('skill groups', () => {
  it('counts sum to the total number of skills', () => {
    const sum = getSkillGroups().reduce((n, g) => n + g.count, 0);
    expect(sum).toBe(getSkills().length);
  });

  it('lists groups exactly as they first occur in skills.yaml', () => {
    const expected = [...new Set(rawEntries('skills.yaml').map((e) => e.group))];
    expect(getSkillGroups().map((g) => g.group)).toEqual(expected);
  });

  it('is consistent: count matches skills and every skill is in its group', () => {
    for (const g of getSkillGroups()) {
      expect(g.count).toBe(g.skills.length);
      expect(g.skills.every((s) => s.group === g.group)).toBe(true);
    }
  });

  it('is stable across calls', () => {
    expect(getSkillGroups()).toEqual(getSkillGroups());
  });
});

describe('handbook chapters', () => {
  it('returns chapters 01 to 09 in numeric order with non-empty titles', () => {
    const chapters = getHandbookChapters();
    expect(chapters.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const c of chapters) expect(c.title.trim()).not.toBe('');
  });

  it('takes the title from the first h1', () => {
    expect(parseChapter('02-x.md', 'intro\n\n# Real title\n\n# Later\n').title).toBe('Real title');
  });

  it('ignores # lines inside fenced code blocks', () => {
    expect(parseChapter('02-x.md', '```sh\n# comment\n```\n\n# Real\n').title).toBe('Real');
  });

  it('rejects a chapter without an h1', () => {
    expect(() => parseChapter('03-x.md', 'no heading here')).toThrow();
  });

  it('orders numerically, not lexically', () => {
    expect(parseChapter('10-x.md', '# T').order).toBe(10);
  });
});

describe('other catalogue files', () => {
  it.each([
    ['hooks.yaml', getHooks],
    ['mcp.yaml', getMcpServers],
    ['agents.yaml', getAgents],
  ])('%s returns one item per entry', (file, load) => {
    const items = load();
    expect(items).toHaveLength(rawEntries(file).length);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('no hard-coded data in src/', () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });

  it('contains no literal skill count 57', () => {
    const offenders = walk('src')
      .filter((f) => /\.(ts|astro|mjs|js|md|mdx|json|ya?ml)$/.test(f))
      .filter((f) => /(?<![\w.#-])57(?![\w.])/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('contains no skill name from skills.yaml as a string literal', () => {
    const names = getSkills().map((s) => s.name);
    const files = walk('src').filter((f) => /\.(ts|astro)$/.test(f));
    const hits = files.flatMap((f) => {
      const text = fs.readFileSync(f, 'utf8');
      return names.filter((n) => text.includes(`'${n}'`) || text.includes(`"${n}"`)).map((n) => `${f}: ${n}`);
    });
    expect(hits).toEqual([]);
  });
});

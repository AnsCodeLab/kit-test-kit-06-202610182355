import fs from 'node:fs';
import { parse } from 'yaml';
import { describe, it, expect } from 'vitest';
import { loadSkillDoc, renderMarkdown, splitFrontMatter } from '../../src/lib/skill-markdown';

describe('splitFrontMatter', () => {
  it('reads name and description and returns the body', () => {
    const { data, body } = splitFrontMatter('---\nname: a\ndescription: "b: c"\n---\n# T\n');
    expect(data).toEqual({ name: 'a', description: 'b: c' });
    expect(body).toBe('# T\n');
  });
  it('keeps plain scalars that are not valid YAML as written', () => {
    const { data } = splitFrontMatter('---\nname: x\ndescription: Use when: naming (a, b)\n---\nbody');
    expect(data).toEqual({ name: 'x', description: 'Use when: naming (a, b)' });
  });
  it('does not end at a rule inside the body', () => {
    expect(splitFrontMatter('---\nname: x\n---\none\n\n---\n\ntwo').body).toBe('one\n\n---\n\ntwo');
  });
  it('returns the source when there is no front matter', () => {
    expect(splitFrontMatter('# Hi')).toEqual({ data: {}, body: '# Hi' });
  });
});

describe('renderMarkdown', () => {
  it('shows raw HTML as text', () => {
    const html = renderMarkdown('<EXTREMELY-IMPORTANT>hi</EXTREMELY-IMPORTANT>\n\n<script>x()</script>');
    expect(html).not.toMatch(/<EXTREMELY|<script/);
    expect(html).toContain('&lt;EXTREMELY-IMPORTANT&gt;');
  });
  it('starts headings at h3 and never skips a level', () => {
    const html = renderMarkdown('# A\n\n#### B\n\n## C');
    expect(html).toMatch(/<h3>A<\/h3>/);
    expect(html).toMatch(/<h4>B<\/h4>/);
    expect(html).toMatch(/<h4>C<\/h4>/);
    expect(html).not.toMatch(/<h1|<h2/);
  });
  it('keeps only http(s) links and turns file links into text', () => {
    const html = renderMarkdown('[a](https://example.com) [b](other.md) [c](../x/y.md#z)');
    expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">a</a>');
    expect(html).toContain('b c');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
  it('wraps code blocks and tables in labelled focusable scroll regions', () => {
    const html = renderMarkdown('```js\nconst a = "<b>";\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('role="region" tabindex="0" aria-label="Code block 1"');
    expect(html).toContain('aria-label="Table 2"');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('class="language-js"');
  });
  it('renders task list boxes as text, not form controls', () => {
    const html = renderMarkdown('- [ ] a\n- [x] b');
    expect(html).not.toContain('<input');
    expect(html).toContain('[ ] a');
  });
  it('replaces images with alt text', () => {
    expect(renderMarkdown('![shot](a.png)')).not.toContain('<img');
  });
});

describe('loadSkillDoc', () => {
  it('rejects ids that could leave content/', () => {
    expect(() => loadSkillDoc('../../README')).toThrow(/Invalid skill id/);
    expect(() => loadSkillDoc('a/b')).toThrow(/Invalid skill id/);
  });
  it('fails loudly when SKILL.md is missing', () => {
    expect(() => loadSkillDoc('no-such-skill')).toThrow(/No SKILL.md/);
  });
});

describe('every skill in the catalogue', () => {
  const skills = parse(fs.readFileSync('content/catalog-data/skills.yaml', 'utf8')) as { id: string }[];
  it('keeps every word of its SKILL.md body (links, headings and code included)', () => {
    for (const { id } of skills) {
      const raw = fs.readFileSync(`content/catalog-data/skills/${id}/SKILL.md`, 'utf8');
      const body = splitFrontMatter(raw).body;
      const text = loadSkillDoc(id)
        .html.replace(/<[^>]*>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const have = new Set(text.match(/[A-Za-z]{4,}/g));
      const missing = [...new Set(body.match(/[A-Za-z]{4,}/g))].filter((w) => !have.has(w));
      // Words that only occur in link targets, fence info strings or HTML comments are not shown.
      const hidden = new Set(
        [...body.matchAll(/\]\(([^)]*)\)|<!--[\s\S]*?-->|^[ \t]*(?:`{3,}|~{3,})[^\n]*/gm)].flatMap((m) => m[0].match(/[A-Za-z]{4,}/g) ?? []),
      );
      expect(missing.filter((w) => !hidden.has(w)), id).toEqual([]);
    }
  });
});

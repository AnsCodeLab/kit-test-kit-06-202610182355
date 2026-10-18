import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { DOC_PAGES, CONCEPT_PAGES, docNeighbours, resolveDocHref } from '../../src/lib/docs';
import { renderDoc } from '../../src/lib/skill-markdown';
import { getHandbookChapters } from '../../src/lib/catalog';

describe('resolveDocHref', () => {
  it('rewrites chapter links to site routes', () => {
    expect(resolveDocHref('03-the-flow.md')).toBe('/docs/the-flow/');
    expect(resolveDocHref('./02-quickstart.md')).toBe('/docs/quickstart/');
    expect(resolveDocHref('06-measuring-effectiveness.md#section')).toBe('/docs/measuring-effectiveness/');
  });
  it('keeps absolute http(s) links', () => {
    expect(resolveDocHref('https://example.com/a')).toBe('https://example.com/a');
  });
  it('returns undefined for files that have no site page', () => {
    for (const href of ['README.md', '../superpowers/results/x.md', 'img/lift.svg', '10-missing.md', '#top', 'http://localhost:3000', 'http://127.0.0.1:4321/x', 'mailto:a@b.c', '']) {
      expect(resolveDocHref(href), href).toBeUndefined();
    }
  });
  it('honours the page list it is given', () => {
    expect(resolveDocHref('03-the-flow.md', [{ id: '01-what-and-why', slug: 'what-and-why' }])).toBeUndefined();
  });
});

describe('renderDoc links', () => {
  it('turns chapter links into anchors and other relative links into plain text', () => {
    const { html } = renderDoc('# T\n\nSee [flow](03-the-flow.md), [readme](README.md), [web](https://example.com).\n');
    expect(html).toContain('<a href="/docs/the-flow/">flow</a>');
    expect(html).toContain('readme,');
    expect(html).not.toContain('README.md');
    expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">web</a>');
  });

  it('leaves no link in any chapter that points outside the site routes', () => {
    const routes = new Set(DOC_PAGES.map((p) => `/docs/${p.slug}/`));
    for (const c of getHandbookChapters()) {
      const { html } = renderDoc(c.body);
      for (const m of html.matchAll(/<a [^>]*href="([^"#][^"]*)"/g)) {
        expect(m[1].startsWith('http') || routes.has(m[1]), `${c.slug}: ${m[1]}`).toBe(true);
      }
    }
  });
});

describe('docs page list', () => {
  it('covers every handbook chapter in numeric order with slugs from filenames', () => {
    const chapters = getHandbookChapters();
    expect(DOC_PAGES.map((p) => p.id)).toEqual(chapters.map((c) => `${String(c.order).padStart(2, '0')}-${c.slug}`));
    expect(DOC_PAGES.map((p) => p.id)).toEqual(fs.readdirSync('content/handbook').filter((f) => /^\d+-.+\.md$/.test(f)).map((f) => f.replace(/\.md$/, '')).sort());
    for (const p of DOC_PAGES) expect(p.id.slice(3)).toBe(p.slug);
    expect(CONCEPT_PAGES).toHaveLength(8);
  });
  it('has no previous on the first and no next on the last', () => {
    expect(docNeighbours(DOC_PAGES[0].slug).prev).toBeUndefined();
    expect(docNeighbours(DOC_PAGES[0].slug).next?.slug).toBe('quickstart');
    expect(docNeighbours(DOC_PAGES.at(-1)!.slug).next).toBeUndefined();
    expect(docNeighbours('faq').prev?.slug).toBe('measuring-effectiveness');
  });
});

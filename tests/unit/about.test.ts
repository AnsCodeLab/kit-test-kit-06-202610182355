import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { NEVER_DOES, LICENCE_CLAIMS, THIRD_PARTY_CLAIMS, assertClaims, normalise, readSource, sourceHasQuote } from '../../src/lib/trust';

const page = fs.readFileSync('src/pages/about/index.astro', 'utf8');

describe('about claims are sentences of the synced kit files', () => {
  for (const c of [...NEVER_DOES, ...LICENCE_CLAIMS, ...THIRD_PARTY_CLAIMS]) {
    it(`${c.id} exists in ${c.source}`, () => {
      expect(sourceHasQuote(readSource(c.source), c.quote)).toBe(true);
    });
  }

  it('covers no network, no credentials written and no overwrite of existing files', () => {
    const quotes = NEVER_DOES.map((c) => c.quote).join(' ');
    expect(quotes).toMatch(/No network/);
    expect(quotes).toMatch(/never writes credentials/);
    expect(quotes).toMatch(/without overwriting anything you already have/);
  });

  it('rejects empty or trivially short claims and an empty list', () => {
    expect(() => assertClaims([])).toThrow(/No claims/);
    expect(() => assertClaims([{ id: 'e', quote: ' ** ', source: 'README.md' }])).toThrow(/too short/);
  });

  it('keeps the --force caveat with the conflict claim', () => {
    expect(NEVER_DOES.find((c) => c.id === 'conflicts-left-alone')?.quote).toContain('--force replaces it');
  });

  it('fails when a claim is not in its source', () => {
    expect(() => assertClaims([{ id: 'x', quote: 'This kit was audited.', source: 'README.md' }])).toThrow(/x/);
  });

  it('matches across line wraps and markdown emphasis', () => {
    expect(normalise('a **b**\n  `c`')).toBe('a b c');
    expect(sourceHasQuote('one\ntwo', 'one two')).toBe(true);
  });
});

describe('about page source', () => {
  it('links the licence and third-party pages and cites no unsourced claim words', () => {
    expect(page).toContain('href="/license/"');
    expect(page).toContain('href="/third-party/"');
    expect(page).not.toMatch(/\d\s*%|audited|certified|trusted by|customers/i);
  });

  it('takes the repository link from the README, not a literal', () => {
    expect(page).not.toMatch(/https?:\/\//);
  });

  it('claims contain no forbidden words', () => {
    const text = [...NEVER_DOES, ...LICENCE_CLAIMS, ...THIRD_PARTY_CLAIMS].map((c) => c.quote).join(' ');
    expect(text).not.toMatch(/\d\s*%|audited|certified|trusted by|customers/i);
    expect(text).not.toMatch(/\b\d+\s+(skills|users|downloads|stars)/i);
  });
});

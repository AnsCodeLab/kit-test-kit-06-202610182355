import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { getRepositoryUrl, parseRepositoryUrl } from '../../src/lib/contact';

const readme = fs.readFileSync('content/README.md', 'utf8');
const page = fs.readFileSync('src/pages/offer/index.astro', 'utf8');

describe('parseRepositoryUrl', () => {
  it('reads the repository link of a README', () => {
    expect(parseRepositoryUrl('see the [repository](https://example.com/r) now')).toBe('https://example.com/r');
  });

  it('fails loudly when there is no repository link', () => {
    expect(() => parseRepositoryUrl('# nothing')).toThrow(/repository/);
  });
});

describe('offer contact call to action', () => {
  it('points to a https URL that appears in the synced README', () => {
    const url = getRepositoryUrl();
    expect(url.startsWith('https://')).toBe(true);
    expect(readme).toContain(url);
  });

  it('takes its target from the README, not from a literal in the page', () => {
    expect(page).not.toMatch(/https?:\/\//);
    expect(page).not.toMatch(/mailto:/);
  });
});

describe('offer page source', () => {
  it('has no form, price, currency or percentage', () => {
    expect(page).not.toMatch(/<form|<input|<select|<textarea/i);
    expect(page).not.toMatch(/\d\s*(?:[$€£¥]|USD|EUR|GBP|VND)|[$€£¥]\s*\d|%/i);
  });
});

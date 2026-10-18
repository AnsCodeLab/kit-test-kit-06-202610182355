import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { readNotices } from '../../src/lib/notices';

const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
const license = fs.readFileSync('content/LICENSE', 'utf8');
const thirdParty = fs.readFileSync('content/THIRD-PARTY.md', 'utf8');
const licensePage = fs.readFileSync('src/pages/license/index.astro', 'utf8');
const thirdPartyPage = fs.readFileSync('src/pages/third-party/index.astro', 'utf8');

describe('notices', () => {
  const notices = readNotices();
  const onDisk = fs.readdirSync('content/catalog-data/skills').filter((f) => /^NOTICE-.*\.md$/.test(f));

  it('lists every NOTICE file, seven of them, with unique anchors', () => {
    expect(notices.map((n) => n.file).sort()).toEqual(onDisk.sort());
    expect(notices).toHaveLength(7);
    expect(new Set(notices.map((n) => n.id)).size).toBe(7);
  });

  it('keeps the file text unmodified and non-empty', () => {
    for (const n of notices) {
      expect(n.text).toBe(fs.readFileSync(`content/catalog-data/skills/${n.file}`, 'utf8'));
      expect(flat(n.text).length).toBeGreaterThan(100);
    }
  });

  it('fails when the notice folder is missing', () => {
    expect(() => readNotices('/nonexistent')).toThrow();
  });
});

describe('legal pages', () => {
  it('license text is substantial and the page reads the synced file', () => {
    expect(flat(license).length).toBeGreaterThan(500);
    expect(licensePage).toContain("'LICENSE'");
  });

  it('third-party page reads THIRD-PARTY.md and the notices', () => {
    expect(flat(thirdParty).length).toBeGreaterThan(300);
    expect(thirdPartyPage).toContain("'THIRD-PARTY.md'");
    expect(thirdPartyPage).toContain('readNotices');
  });
});

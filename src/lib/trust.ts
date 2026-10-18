import fs from 'node:fs';
import path from 'node:path';

export interface Claim {
  id: string;
  /** Sentence shown on the page; it must appear in `source`. */
  quote: string;
  /** Synced kit file the sentence comes from. */
  source: 'README.md' | 'THIRD-PARTY.md' | 'LICENSE';
}

export const NEVER_DOES: Claim[] = [
  { id: 'no-network', quote: 'No network, no secrets.', source: 'README.md' },
  { id: 'no-credentials', quote: 'It never installs software, never logs in, never writes credentials.', source: 'README.md' },
  { id: 'no-overwrite', quote: 'without overwriting anything you already have', source: 'README.md' },
  { id: 'conflicts-left-alone', quote: 'For JSON, YAML and script targets, a hand-edited value in a key the kit manages is reported as a conflict and left alone; --force replaces it.', source: 'README.md' },
  { id: 'writes-and-exits', quote: 'It writes files and exits.', source: 'README.md' },
  { id: 'rerunnable', quote: 'Running it again with the same choices changes nothing', source: 'README.md' },
];

export const LICENCE_CLAIMS: Claim[] = [
  { id: 'readme-licence', quote: 'MIT, see LICENSE.', source: 'README.md' },
  { id: 'vendored-licences', quote: 'Vendored skills keep their upstream licenses; see THIRD-PARTY.md.', source: 'README.md' },
];

export const THIRD_PARTY_CLAIMS: Claim[] = [
  { id: 'upstream-mit', quote: 'Vendored content keeps its upstream MIT license.', source: 'THIRD-PARTY.md' },
  { id: 'original', quote: 'All other catalog skills, templates and code are original to this project (MIT, see LICENSE).', source: 'THIRD-PARTY.md' },
];

/** Collapses line wraps and drops markdown emphasis and code ticks so a quote can be matched in the raw file. */
export function normalise(text: string): string {
  return text.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
}

export function sourceHasQuote(content: string, quote: string): boolean {
  return normalise(content).includes(normalise(quote));
}

export function readSource(name: Claim['source'], root = path.join(process.cwd(), 'content')): string {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

/** Throws when a claim sentence is not in its source file, so the page cannot state anything the kit does not. */
export function assertClaims(claims: Claim[], root?: string): void {
  if (claims.length === 0) throw new Error('No claims to check');
  for (const c of claims) {
    if (normalise(c.quote).length < 10) throw new Error(`Claim '${c.id}' is too short to verify`);
    if (!sourceHasQuote(readSource(c.source, root), c.quote)) {
      throw new Error(`Claim '${c.id}' is not found in ${c.source}: "${c.quote}"`);
    }
  }
}

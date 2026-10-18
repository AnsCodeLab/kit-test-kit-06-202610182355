import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { builtPages } from '../../scripts/pages.mjs';

describe('builtPages', () => {
  it('maps built html files to URL paths and skips 404', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'index.html'), '');
    fs.writeFileSync(path.join(dir, '404.html'), '');
    fs.writeFileSync(path.join(dir, 'docs', 'index.html'), '');
    expect(builtPages(dir)).toEqual(['/', '/docs']);
  });
});

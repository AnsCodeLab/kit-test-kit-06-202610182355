import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checksumLines, listFiles, sourceDateEpoch, runRelease } from '../../scripts/release.mjs';

const dirs: string[] = [];
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('release helpers', () => {
  it('lists files sorted by code point, independent of creation order', () => {
    const dir = tmp();
    for (const f of ['b.txt', 'B.txt', 'a/z.txt', 'a/a.txt', '_x']) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), f);
    }
    expect(listFiles(dir)).toEqual(['B.txt', '_x', 'a/a.txt', 'a/z.txt', 'b.txt']);
  });

  it('writes sha256sum style lines', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'a.txt'), 'abc');
    expect(checksumLines(dir)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  a.txt\n');
  });

  it('uses an explicit SOURCE_DATE_EPOCH and otherwise a stable value', () => {
    expect(sourceDateEpoch({ SOURCE_DATE_EPOCH: '1700000000' }, '/nonexistent')).toBe('1700000000');
    expect(sourceDateEpoch({}, '/nonexistent')).toBe('0');
  });
});

describe('release:build', () => {
  // Builds in a scratch copy of the project so it never rewrites dist/ that other tests read.
  it('gives an identical SHA256SUMS when run twice', () => {
    const work = tmp();
    for (const name of ['package.json', 'tsconfig.json', 'astro.config.mjs', 'scripts', 'src', 'public', 'content']) {
      fs.cpSync(path.resolve(name), path.join(work, name), { recursive: true });
    }
    fs.symlinkSync(path.resolve('node_modules'), path.join(work, 'node_modules'), 'dir');
    const env = { ...process.env, KIT_SOURCE: process.env.KIT_SOURCE ?? '/source', SOURCE_DATE_EPOCH: '1700000000' };
    const run = () => {
      runRelease({ cwd: work, skipInstall: true, log: () => {}, env });
      return fs.readFileSync(path.join(work, 'release/SHA256SUMS'), 'utf8');
    };
    const first = run();
    const second = run();
    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe(first);
    expect(first).toContain('  release.json\n');
    const meta = JSON.parse(fs.readFileSync(path.join(work, 'dist/release.json'), 'utf8'));
    expect(meta.builtAt).toBe('2023-11-14T22:13:20.000Z');
    expect(meta.fileCount).toBe(first.trim().split('\n').length);
  }, 300_000);
});

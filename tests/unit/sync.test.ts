import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
let src: string;
let content: string;

function write(base: string, rel: string, text: string) {
  const file = path.join(base, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function run(script: string) {
  return spawnSync('node', [path.join(root, 'scripts', script)], {
    env: { ...process.env, KIT_SOURCE: src, CONTENT_DIR: content },
    encoding: 'utf8',
  });
}

beforeEach(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
  src = path.join(tmp, 'source');
  content = path.join(tmp, 'content');
  write(src, 'catalog-data/skills.yaml', 'skills: []\n');
  for (const n of ['hooks', 'mcp', 'agents', 'ides', 'presets']) {
    write(src, `catalog-data/${n}.yaml`, `${n}: []\n`);
  }
  write(src, 'THIRD-PARTY.md', 'third\n');
  write(src, 'catalog-data/skills/NOTICE-x.md', 'notice\n');
  write(src, 'catalog-data/skills/alpha/SKILL.md', 'alpha\n');
  write(src, 'catalog-data/skills/alpha/other.md', 'not copied\n');
  write(src, 'handbook/01-a.md', 'chapter\n');
  write(src, 'README.md', 'readme\n');
  write(src, 'LICENSE', 'mit\n');
  expect(run('sync-content.mjs').status).toBe(0);
});

describe('sync and check-sync', () => {
  it('copies only the needed files and writes a manifest with sha-256 sums', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(content, '.sync-manifest.json'), 'utf8'));
    expect(Object.keys(manifest.files)).toEqual([
      'LICENSE',
      'README.md',
      'THIRD-PARTY.md',
      'catalog-data/agents.yaml',
      'catalog-data/hooks.yaml',
      'catalog-data/ides.yaml',
      'catalog-data/mcp.yaml',
      'catalog-data/presets.yaml',
      'catalog-data/skills.yaml',
      'catalog-data/skills/NOTICE-x.md',
      'catalog-data/skills/alpha/SKILL.md',
      'handbook/01-a.md',
    ]);
    for (const h of [...Object.values<string>(manifest.files), manifest.checksum]) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(fs.existsSync(path.join(content, 'catalog-data/skills/alpha/other.md'))).toBe(false);
  });

  it('passes on a fresh sync', () => {
    expect(run('check-sync.mjs').status).toBe(0);
  });

  it('fails when one byte of a copied file in content changes', () => {
    write(content, 'handbook/01-a.md', 'chapteR\n');
    const r = run('check-sync.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('handbook/01-a.md');
  });

  it('fails on drift by edit in the source', () => {
    write(src, 'README.md', 'readme changed\n');
    const r = run('check-sync.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('README.md');
  });

  it('fails on drift by deletion in the source', () => {
    fs.rmSync(path.join(src, 'handbook/01-a.md'));
    const r = run('check-sync.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('handbook/01-a.md');
  });

  it('fails on a file added to the source', () => {
    write(src, 'handbook/02-b.md', 'new\n');
    const r = run('check-sync.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('handbook/02-b.md');
  });

  it('fails on a copied file missing from content and on an extra file in content', () => {
    fs.rmSync(path.join(content, 'LICENSE'));
    expect(run('check-sync.mjs').stderr).toContain('missing from content: LICENSE');
    execFileSync('node', [path.join(root, 'scripts/sync-content.mjs')], {
      env: { ...process.env, KIT_SOURCE: src, CONTENT_DIR: content },
    });
    write(content, 'stray.md', 'x\n');
    expect(run('check-sync.mjs').stderr).toContain('extra file in content: stray.md');
  });

  it('fails on edits to a SKILL.md or NOTICE file in content', () => {
    write(content, 'catalog-data/skills/alpha/SKILL.md', 'alphA\n');
    expect(run('check-sync.mjs').stderr).toContain('alpha/SKILL.md');
    write(content, 'catalog-data/skills/alpha/SKILL.md', 'alpha\n');
    write(content, 'catalog-data/skills/NOTICE-x.md', 'notice!\n');
    expect(run('check-sync.mjs').stderr).toContain('NOTICE-x.md');
  });

  it('refuses to sync when a required kit file is missing', () => {
    fs.rmSync(path.join(src, 'LICENSE'));
    const r = run('sync-content.mjs');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('LICENSE');
    expect(fs.existsSync(path.join(content, 'LICENSE'))).toBe(true);
  });

  it('fails when the manifest is missing', () => {
    fs.rmSync(path.join(content, '.sync-manifest.json'));
    expect(run('check-sync.mjs').status).not.toBe(0);
  });

  it('fails when KIT_SOURCE does not exist', () => {
    fs.rmSync(src, { recursive: true });
    expect(run('check-sync.mjs').status).not.toBe(0);
  });
});

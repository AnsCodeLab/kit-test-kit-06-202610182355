import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { parseAllowlist, scanText, RULES } from '../../scripts/scan-secrets.mjs';

const script = path.resolve('scripts/scan-secrets.mjs');
const run = (root: string, ...extra: string[]) =>
  spawnSync('node', [script, '--root', root, ...extra], { encoding: 'utf8' });

// Fake values are assembled at run time so no matching literal exists in the repository.
const fakeGithubToken = () => 'gh' + 'p_' + 'a1B2c3D4e5'.repeat(4);
const fakeAwsKey = () => 'AK' + 'IA' + 'ABCDEFGH12345678';
const fakePrivateKeyHeader = () => '-----' + 'BEGIN RSA PRIVATE' + ' KEY-----';

let dir: string;
const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: dir, stdio: 'ignore' });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-secrets-'));
  git('init', '-q');
  fs.writeFileSync(path.join(dir, 'clean.txt'), 'nothing to see here\n');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('scan-secrets', () => {
  it('passes the clean repository (also proves no file matches the scanner patterns)', () => {
    const r = run(path.resolve('.'));
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('passes a clean fixture', () => {
    expect(run(dir).status).toBe(0);
  });

  it('flags a planted fake token in the working tree without printing it', () => {
    const token = fakeGithubToken();
    fs.writeFileSync(path.join(dir, 'config.txt'), `value ${token}\n`);
    const r = run(dir, '--no-history');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('github-token in config.txt:1');
    expect(r.stderr).not.toContain(token);
  });

  it('flags a secret that was committed and then deleted (history)', () => {
    fs.writeFileSync(path.join(dir, 'old.txt'), `${fakeAwsKey()}\n`);
    git('add', '.');
    git('commit', '-q', '-m', 'add');
    fs.rmSync(path.join(dir, 'old.txt'));
    git('add', '-A');
    git('commit', '-q', '-m', 'remove');
    expect(run(dir, '--no-history').status).toBe(0);
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('aws-access-key in old.txt');
  });

  it('flags private key headers and generic token assignments', () => {
    expect(scanText(fakePrivateKeyHeader(), 'a')[0].rule).toBe('private-key');
    const generic = 'api_' + 'token = "' + 'x9'.repeat(12) + '"';
    expect(scanText(generic, 'a')[0].rule).toBe('generic-assignment');
    expect(scanText('const token = getToken(options);', 'a')).toEqual([]);
    expect(RULES.length).toBeGreaterThanOrEqual(5);
  });

  it('honours an allowlist entry that has a reason, and rejects one without', () => {
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.writeFileSync(path.join(dir, 'doc.txt'), `${fakeGithubToken()}\n`);
    const al = path.join(dir, 'scripts', 'secret-scan-allowlist.txt');
    fs.writeFileSync(al, 'github-token doc.txt documented example value\n');
    expect(run(dir, '--no-history').status).toBe(0);
    fs.writeFileSync(al, 'github-token doc.txt\n');
    expect(run(dir, '--no-history').status).toBe(1);
  });

  it('keeps a reason on every entry of the real allowlist', () => {
    const text = fs.readFileSync('scripts/secret-scan-allowlist.txt', 'utf8');
    expect(parseAllowlist(text).problems).toEqual([]);
  });
});

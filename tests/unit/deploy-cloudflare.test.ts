import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { runDeploy, missingVars, redact, firstPagesUrl } from '../../scripts/deploy-cloudflare.mjs';

const DUMMY = ['dummy', 'value', '0123456789'].join('-');
const env = { CLOUDFLARE_API_TOKEN: DUMMY, CLOUDFLARE_ACCOUNT_ID: 'acct-dummy', CF_PAGES_PROJECT: 'demo-project' };

const dirs: string[] = [];
function site(files: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-'));
  dirs.push(dir);
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, 'dist', f)), { recursive: true });
    fs.writeFileSync(path.join(dir, 'dist', f), 'x');
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function run(e: Record<string, string | undefined>, argv: string[], cwd: string) {
  let out = '';
  let err = '';
  const code = await runDeploy({ env: e, argv, cwd, out: (s) => (out += s), err: (s) => (err += s) });
  return { code, out, err };
}

describe('deploy-cloudflare', () => {
  it('refuses when a variable is missing and names it without printing the token', async () => {
    const cwd = site(['index.html']);
    const { code, out, err } = await run({ ...env, CLOUDFLARE_ACCOUNT_ID: undefined }, ['--dry-run'], cwd);
    expect(code).not.toBe(0);
    expect(err).toContain('CLOUDFLARE_ACCOUNT_ID');
    expect(out + err).not.toContain(DUMMY);
  });

  it('names CLOUDFLARE_API_TOKEN when only the token is missing', async () => {
    const cwd = site(['index.html']);
    const { code, err } = await run({ ...env, CLOUDFLARE_API_TOKEN: undefined }, [], cwd);
    expect(code).not.toBe(0);
    expect(err).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('treats a blank value as missing', () => {
    expect(missingVars({ ...env, CF_PAGES_PROJECT: '  ' })).toEqual(['CF_PAGES_PROJECT']);
  });

  it('dry run prints the project and the dist file count and no token', async () => {
    const cwd = site(['index.html', 'a/b.html', 'c.css']);
    const { code, out, err } = await run(env, ['--dry-run'], cwd);
    expect(code).toBe(0);
    expect(out).toContain('demo-project');
    expect(out).toContain('production branch main');
    expect(out).toContain('3 files');
    expect(out + err).not.toContain(DUMMY);
  });

  it('dry run mentions the preview branch when set', async () => {
    const cwd = site(['index.html']);
    const { out } = await run({ ...env, CF_PAGES_BRANCH: 'preview-x' }, ['--dry-run'], cwd);
    expect(out).toContain('preview-x');
  });

  it('fails clearly when dist is missing', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-'));
    dirs.push(cwd);
    const { code, err } = await run(env, ['--dry-run'], cwd);
    expect(code).not.toBe(0);
    expect(err).toContain('dist/');
  });

  it('redacts the token and bearer credentials', () => {
    expect(redact(`token ${DUMMY} and Authorization: Bearer abc.def`, env)).toBe('token [redacted] and Authorization: Bearer [redacted]');
  });

  it('finds the deployment URL in wrangler output', () => {
    expect(firstPagesUrl('Success! Take a peek over at https://abc123.demo.pages.dev\n')).toBe('https://abc123.demo.pages.dev');
    expect(firstPagesUrl('nothing here')).toBeNull();
  });

  it('npm entry point exits non-zero naming the missing token', async () => {
    const cwd = site(['index.html']);
    const clean: NodeJS.ProcessEnv = { PATH: process.env.PATH };
    const result = await new Promise<{ code: number | null; text: string }>((resolve) => {
      execFile('node', [path.resolve('scripts/deploy-cloudflare.mjs')], { cwd, env: clean }, (e, stdout, stderr) =>
        resolve({ code: e ? ((e as { code?: number }).code ?? 1) : 0, text: stdout + stderr }),
      );
    });
    expect(result.code).not.toBe(0);
    expect(result.text).toContain('CLOUDFLARE_API_TOKEN');
  });
});

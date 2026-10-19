// Deploys dist/ to Cloudflare Pages with `wrangler pages deploy` (direct upload, no Git integration).
// Usage: node scripts/deploy-cloudflare.mjs [--dry-run]
// Reads CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and CF_PAGES_PROJECT from the environment only;
// CF_PAGES_BRANCH is optional and selects a preview deployment. Without it the deploy goes to the production
// branch (CF_PAGES_PROJECT's production branch, CF_PAGES_PRODUCTION_BRANCH, default main), passed to wrangler
// explicitly so a detached checkout (a rollback) or a feature branch cannot turn it into a preview. The token is never printed.
// --dry-run checks the environment and dist/, prints the target and the file count, and skips the upload.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REQUIRED = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CF_PAGES_PROJECT'];
const SECRETS = ['CLOUDFLARE_API_TOKEN'];

export const missingVars = (env) => REQUIRED.filter((name) => !env[name]?.trim());

// Replaces every secret value (and anything shaped like a bearer credential) before text is printed.
export function redact(text, env) {
  let out = text;
  for (const name of SECRETS) {
    const value = env[name]?.trim();
    if (value) out = out.split(value).join('[redacted]');
  }
  return out.replace(/(Bearer\s+)\S+/gi, '$1[redacted]');
}

export function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    n += entry.isDirectory() ? countFiles(full) : entry.isFile() ? 1 : 0;
  }
  return n;
}

export const pagesUrl = (project) => `https://${project}.pages.dev`;

export function firstPagesUrl(text) {
  return text.match(/https:\/\/[a-z0-9.-]+\.pages\.dev\S*/i)?.[0] ?? null;
}

function upload({ project, branch, env, out, err }) {
  const args = ['--yes', 'wrangler@4', 'pages', 'deploy', 'dist', '--project-name', project, '--branch', branch];
  return new Promise((resolve) => {
    let seen = '';
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const pipe = (stream, write) =>
      stream.on('data', (chunk) => {
        const text = redact(chunk.toString(), env);
        seen += text;
        write(text);
      });
    pipe(child.stdout, out);
    pipe(child.stderr, err);
    child.on('error', (e) => resolve({ code: 1, url: null, seen: `${seen}${redact(e.message, env)}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, url: firstPagesUrl(seen), seen }));
  });
}

export async function runDeploy({ env = process.env, argv = [], cwd = process.cwd(), out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s) } = {}) {
  const missing = missingVars(env);
  if (missing.length > 0) {
    err(`deploy: missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}\n`);
    err('deploy: set them in the environment (never in a file in the repository) and run again.\n');
    return 1;
  }
  const dist = path.join(cwd, 'dist');
  if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
    err('deploy: dist/ not found, run npm run release:build first.\n');
    return 1;
  }
  const project = env.CF_PAGES_PROJECT.trim();
  const preview = env.CF_PAGES_BRANCH?.trim() || '';
  const branch = preview || env.CF_PAGES_PRODUCTION_BRANCH?.trim() || 'main';
  const files = countFiles(dist);
  if (files === 0) {
    err('deploy: dist/ is empty, run npm run release:build first.\n');
    return 1;
  }
  const target = preview ? `${project} (preview branch ${preview})` : `${project} (production branch ${branch})`;
  if (argv.includes('--dry-run')) {
    out(`deploy: dry run, nothing uploaded\ndeploy: target project ${target}\ndeploy: ${files} files in dist/\n`);
    return 0;
  }
  out(`deploy: uploading ${files} files to ${target}\n`);
  const result = await upload({ project, branch, env: { ...env, CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN.trim() }, out, err });
  if (result.code !== 0) {
    err(`deploy: wrangler exited with code ${result.code}\n`);
    return result.code;
  }
  out(`deploy: done, URL ${result.url ?? (preview ? `https://${preview}.${project}.pages.dev` : pagesUrl(project))}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runDeploy({ argv: process.argv.slice(2) });
}

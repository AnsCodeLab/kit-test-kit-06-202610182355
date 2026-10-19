// Reproducible release build.
// Usage: node scripts/release.mjs [--skip-install]
// Runs npm ci, the sync check and the build, then writes dist/release.json and release/SHA256SUMS.
// The build environment is pinned (TZ, LC_ALL, SOURCE_DATE_EPOCH) and no output carries a wall-clock
// time or random id, so two builds of the same commit give an identical SHA256SUMS.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const git = (args, cwd) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

// Every file under dir as a forward-slash relative path, sorted by code point (locale independent).
export function listFiles(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(dir, r));
    else if (entry.isFile()) out.push(r);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// sha256sum compatible text: "<hex>  <path>" per file, sorted, LF endings.
export function checksumLines(dir) {
  return listFiles(dir)
    .map((rel) => {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
      return `${hash}  ${rel}\n`;
    })
    .join('');
}

// The commit time of HEAD keeps SOURCE_DATE_EPOCH stable across builds of one commit. An explicit value wins.
export function sourceDateEpoch(env, cwd) {
  if (env.SOURCE_DATE_EPOCH && /^\d+$/.test(env.SOURCE_DATE_EPOCH)) return env.SOURCE_DATE_EPOCH;
  return git(['log', '-1', '--format=%ct'], cwd) || '0';
}

export function buildEnv(env, cwd) {
  return { ...env, TZ: 'UTC', LC_ALL: 'C', LANG: 'C', SOURCE_DATE_EPOCH: sourceDateEpoch(env, cwd), NO_COLOR: '1' };
}

export function runRelease({ cwd = process.cwd(), env = process.env, skipInstall = false, log = console.log } = {}) {
  const buildOpts = { cwd, env: buildEnv(env, cwd), stdio: 'inherit' };
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  if (!skipInstall) execFileSync(npm, ['ci'], buildOpts);
  execFileSync(npm, ['run', 'check:sync'], buildOpts);
  execFileSync(npm, ['run', 'build'], buildOpts);

  const dist = path.join(cwd, 'dist');
  const releaseJson = path.join(dist, 'release.json');
  fs.rmSync(releaseJson, { force: true });
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const epoch = buildOpts.env.SOURCE_DATE_EPOCH;
  const manifestPath = path.join(cwd, 'content', '.sync-manifest.json');
  const release = {
    name: pkg.name,
    version: git(['describe', '--tags', '--exact-match', '--match', 'v[0-9]*.[0-9]*.[0-9]*'], cwd) || pkg.version,
    commit: git(['rev-parse', 'HEAD'], cwd) || 'unknown',
    sourceDateEpoch: Number(epoch),
    builtAt: new Date(Number(epoch) * 1000).toISOString(),
    contentChecksum: fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).checksum : null,
    fileCount: listFiles(dist).length + 1,
  };
  fs.writeFileSync(releaseJson, `${JSON.stringify(release, null, 2)}\n`);

  const sums = checksumLines(dist);
  const outDir = path.join(cwd, 'release');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'SHA256SUMS'), sums);
  log(`release: ${release.version} (${release.commit.slice(0, 12)}), ${release.fileCount} files, release/SHA256SUMS written`);
  return release;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runRelease({ skipInstall: process.argv.includes('--skip-install') });
  } catch (err) {
    console.error(`release: failed: ${err.message}`);
    process.exit(1);
  }
}

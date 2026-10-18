// Offline secret scanner: high-signal regexes over the working tree and the git history.
// Usage: node scripts/scan-secrets.mjs [--root <dir>] [--no-history]
// Exits 1 when anything matches. Matched values are never printed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RULES = [
  { id: 'private-key', re: new RegExp('-{5}BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-{5}') },
  { id: 'aws-access-key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/ },
  { id: 'cloudflare-token', re: /cloudflare[\w .-]{0,30}(?:token|key)[\w .-]{0,10}[:=]\s*["']?[A-Za-z0-9_-]{40}\b/i },
  {
    id: 'generic-assignment',
    re: /\b[\w-]*(?:token|secret|api[_-]?key|passw(?:or)?d)[\w-]*["']?\s*[:=]\s*["']?(?=[A-Za-z0-9+/_.=-]*\d)(?=[A-Za-z0-9+/_.=-]*[A-Za-z])[A-Za-z0-9+/_.=-]{20,}["']?/i,
  },
];

const SKIP_FILES = new Set(['package-lock.json']);
const ALLOWLIST_FILE = 'scripts/secret-scan-allowlist.txt';

// Allowlist lines: <rule-id or *> <path> <reason...>. A reason is mandatory.
export function parseAllowlist(text) {
  const entries = [];
  const problems = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S.*)$/);
    if (!m) problems.push(`${ALLOWLIST_FILE}:${i + 1}: entry needs "<rule|*> <path> <reason>"`);
    else entries.push({ rule: m[1], file: m[2], reason: m[3] });
  });
  return { entries, problems };
}

function allowed(entries, rule, file) {
  return entries.some((e) => (e.rule === '*' || e.rule === rule) && e.file === file);
}

export function scanText(text, file, entries = [], where = '') {
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (line.length > 2000) return;
    for (const rule of RULES) {
      if (rule.re.test(line) && !allowed(entries, rule.id, file)) {
        out.push({ rule: rule.id, file, line: i + 1, where });
      }
    }
  });
  return out;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
}

function isGitRepo(root) {
  try {
    git(root, ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

function listTree(root) {
  if (isGitRepo(root)) {
    return git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean);
  }
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else files.push(rel);
    }
  };
  walk('');
  return files;
}

export function scanTree(root, entries) {
  const found = [];
  for (const file of listTree(root)) {
    if (SKIP_FILES.has(path.posix.basename(file))) continue;
    let buf;
    try {
      buf = fs.readFileSync(path.join(root, file));
    } catch {
      continue;
    }
    if (buf.includes(0)) continue;
    found.push(...scanText(buf.toString('utf8'), file, entries));
  }
  return found;
}

export function scanHistory(root, entries) {
  if (!isGitRepo(root)) return [];
  let log;
  try {
    log = git(root, ['log', '--all', '-p', '-U0', '--no-color', '--no-ext-diff', '--format=commit %h']);
  } catch {
    return [];
  }
  const found = [];
  let commit = '';
  let file = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('commit ')) commit = line.slice(7);
    else if (line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6) : '';
    else if (line.startsWith('+') && file && !SKIP_FILES.has(path.posix.basename(file))) {
      found.push(...scanText(line.slice(1), file, entries, `history ${commit}`).map((f) => ({ ...f, line: 0 })));
    }
  }
  return found;
}

export function scan(root, { history = true } = {}) {
  const alPath = path.join(root, ALLOWLIST_FILE);
  const { entries, problems } = parseAllowlist(fs.existsSync(alPath) ? fs.readFileSync(alPath, 'utf8') : '');
  const findings = [...scanTree(root, entries), ...(history ? scanHistory(root, entries) : [])];
  return { findings, problems };
}

function main() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : '.');
  const { findings, problems } = scan(root, { history: !args.includes('--no-history') });
  for (const p of problems) console.error(p);
  const seen = new Set();
  for (const f of findings) {
    const key = `${f.rule}|${f.file}|${f.line}|${f.where}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`secret-scan: ${f.rule} in ${f.file}${f.line ? `:${f.line}` : ''}${f.where ? ` (${f.where})` : ''}`);
  }
  if (findings.length || problems.length) {
    console.error(`secret-scan: FAILED (${seen.size} finding(s), ${problems.length} allowlist problem(s)). Values are not printed.`);
    process.exit(1);
  }
  console.log('secret-scan: clean (working tree and history)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

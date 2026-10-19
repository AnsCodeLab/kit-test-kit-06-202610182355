// Builds the data behind the Home hero replay from the synced kit source (content/).
// Nothing here is invented: step names come from the quickstart wizard table, the picks from its
// non-interactive example, the files from the README 'What gets written' table.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPLAY_FILE =
  process.env.REPLAY_FILE || fileURLToPath(new URL('../src/data/replay.json', import.meta.url));

// Only the unit tests of the sync itself, which use a minimal fixture source, set SKIP_REPLAY=1. The real kit
// has the quickstart chapter, and a missing one must fail the build, not silently keep stale data.
export function hasReplayInputs() {
  return process.env.SKIP_REPLAY !== '1';
}

function section(md, heading) {
  const m = new RegExp(`^##[ \\t]+${heading}[ \\t]*$`, 'm').exec(md);
  if (!m) throw new Error(`replay: section not found: ${heading}`);
  const rest = md.slice(m.index + m[0].length);
  const next = /^##[ \t]/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function tableRows(md) {
  return md
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .slice(2);
}

export function buildReplay(quickstart, readme) {
  const command = /^npx (@anscodelab\/coding-agent-kit)\s*$/m.exec(section(quickstart, 'Run it'));
  if (!command) throw new Error('replay: quickstart has no bare npx command');

  if (!quickstart.includes('Apply these changes?')) throw new Error("replay: no 'Apply these changes?' prompt");

  const wizard = tableRows(section(quickstart, 'The interactive wizard'));
  const stepLabels = Object.fromEntries(
    wizard.map(([step]) => [step.toLowerCase(), step]),
  );
  const need = (key) => {
    if (!stepLabels[key]) throw new Error(`replay: wizard table has no '${key}' step`);
    return stepLabels[key];
  };

  const targetRow = wizard.find(([s]) => s === 'Target');
  const target = /`(Use current directory)`/.exec(targetRow?.[1] ?? '');
  if (!target) throw new Error("replay: no 'Use current directory' target");

  const example = /npx @anscodelab\/coding-agent-kit\s*\\\n((?:.*\\\n)*.*)/.exec(section(quickstart, 'Non-interactive mode'));
  if (!example) throw new Error('replay: no non-interactive example');
  const flags = Object.fromEntries(
    [...example[0].replace(/\\\n/g, ' ').matchAll(/--(\w+) ([^\s-][^\s]*)/g)].map((m) => [m[1], m[2]]),
  );
  for (const f of ['agent', 'ide', 'skills', 'mcp', 'hooks']) {
    if (!flags[f]) throw new Error(`replay: example lacks --${f}`);
  }

  const steps = [
    { label: need('target'), value: target[1] },
    { label: need('agent'), value: flags.agent },
    { label: need('ide/ade'), value: flags.ide },
    { label: need('skills'), value: flags.skills.split(',').join(', ') },
    { label: need('mcp servers'), value: flags.mcp.split(',').join(', ') },
    { label: need('safeguards and tooling'), value: flags.hooks },
  ];

  const written = tableRows(section(readme, 'What gets written'));
  const wrote = (choice, re) => {
    const row = written.find(([c]) => c === choice);
    const hit = row && [...row[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]).find((p) => re.test(p));
    if (!hit) throw new Error(`replay: README table has no matching path for ${choice}`);
    return hit;
  };
  const files = [
    { path: wrote('Agent', /^CLAUDE\.md$/), step: need('agent') },
    { path: wrote('Skills', /^\.claude\/skills\/$/), step: need('skills') },
    { path: wrote('MCP servers', /^\.mcp\.json$/), step: need('mcp servers') },
    { path: wrote('VS Code', /^\.vscode\/extensions\.json$/), step: need('ide/ade') },
    { path: wrote('Hooks', /^\.git\/hooks\/pre-commit$/), step: need('safeguards and tooling') },
  ];

  return { command: `npx ${command[1]}`, steps, confirm: 'Apply these changes?', answer: 'yes', files };
}

export function buildReplayFromContent(dir) {
  return buildReplay(
    fs.readFileSync(path.join(dir, 'handbook', '02-quickstart.md'), 'utf8'),
    fs.readFileSync(path.join(dir, 'README.md'), 'utf8'),
  );
}

export function serializeReplay(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

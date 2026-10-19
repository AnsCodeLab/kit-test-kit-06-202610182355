import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { buildReplayFromContent, serializeReplay } from '../../scripts/replay-lib.mjs';
import replay from '../../src/data/replay.json';
import { INSTALL_COMMAND } from '../../src/lib/install';

const quickstart = fs.readFileSync('content/handbook/02-quickstart.md', 'utf8');
const readme = fs.readFileSync('content/README.md', 'utf8');
const source = `${quickstart}\n${readme}`;

describe('hero replay data', () => {
  it('is exactly what the sync derives from content/', () => {
    expect(fs.readFileSync('src/data/replay.json', 'utf8')).toBe(serializeReplay(buildReplayFromContent('content')));
  });

  it('uses the product command', () => {
    expect(replay.command).toBe(INSTALL_COMMAND);
    expect(source).toContain(replay.command);
  });

  it('every step label is a row of the quickstart wizard table', () => {
    for (const s of replay.steps) expect(quickstart, s.label).toMatch(new RegExp(`^\\| ${s.label.replace(/[/]/g, '\\/')} \\|`, 'm'));
  });

  it('every picked value comes from the quickstart (option name or example flag)', () => {
    for (const s of replay.steps) for (const v of s.value.split(', ')) expect(quickstart, v).toContain(v);
  });

  it('every file path is listed in the README table and the quickstart', () => {
    for (const f of replay.files) {
      expect(readme, f.path).toContain(`\`${f.path}\``);
      expect(quickstart, f.path).toContain(f.path);
      expect(replay.steps.map((s) => s.label), f.step).toContain(f.step);
    }
  });

  it('the picks are the flags of the quickstart non-interactive example, in the same command', () => {
    const cmd = /npx @anscodelab\/coding-agent-kit\s*\\\n\s*--agent (\S+) --ide (\S+) \\\n\s*--skills (\S+) \\\n\s*--mcp (\S+) --hooks (\S+)/.exec(quickstart)!;
    const picks = Object.fromEntries(replay.steps.map((s) => [s.label, s.value]));
    expect(picks.Agent).toBe(cmd[1]);
    expect(picks['IDE/ADE']).toBe(cmd[2]);
    expect(picks.Skills).toBe(cmd[3].split(',').join(', '));
    expect(picks['MCP servers']).toBe(cmd[4].split(',').join(', '));
    expect(picks['Safeguards and tooling']).toBe(cmd[5]);
  });

  it('the confirmation prompt and the dry-run word are in the quickstart', () => {
    expect(quickstart).toContain(replay.confirm);
    expect(quickstart).toContain('created');
  });
});

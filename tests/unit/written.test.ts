import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseWritten, getWrittenRows, writtenPaths } from '../../src/lib/written';
import { INSTALL_COMMAND } from '../../src/lib/install';

const readme = fs.readFileSync('content/README.md', 'utf8');

describe('parseWritten', () => {
  it('reads rows and code spans from a table', () => {
    const rows = parseWritten('## What gets written\n\n| Choice | Written to |\n|---|---|\n| A | `a.md` or `b/` here |\n\n## Next\n');
    expect(rows).toEqual([
      {
        choice: 'A',
        segments: [
          { text: 'a.md', code: true },
          { text: ' or ', code: false },
          { text: 'b/', code: true },
          { text: ' here', code: false },
        ],
      },
    ]);
  });

  it('fails loudly when the section or table is missing', () => {
    expect(() => parseWritten('# nothing')).toThrow(/What gets written/);
    expect(() => parseWritten('## What gets written\n\ntext\n')).toThrow(/no rows/);
  });
});

describe('synced README', () => {
  const rows = getWrittenRows();
  const paths = writtenPaths(rows);

  it('lists the files the kit writes', () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        'CLAUDE.md',
        'AGENTS.md',
        '.claude/skills/',
        '.agents/skills/',
        '.mcp.json',
        '.vscode/extensions.json',
        '.orca/config.yaml',
        '.git/hooks/pre-commit',
        '.claude/statusline.sh',
      ]),
    );
  });

  it('every listed path appears verbatim in the README source', () => {
    for (const p of paths) expect(readme, p).toContain(p);
  });

  it('every row choice appears verbatim in the README source', () => {
    for (const r of rows) expect(readme, r.choice).toContain(r.choice);
  });

  it('the install command appears verbatim in the README source', () => {
    expect(readme).toContain(INSTALL_COMMAND);
  });
});

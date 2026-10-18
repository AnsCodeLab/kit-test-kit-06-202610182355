import fs from 'node:fs';
import path from 'node:path';

export interface WrittenSegment {
  text: string;
  /** True when the segment was a backtick code span in the README, i.e. a path. */
  code: boolean;
}

export interface WrittenRow {
  choice: string;
  segments: WrittenSegment[];
}

const HEADING = /^##[ \t]+What gets written[ \t]*$/m;

/** Splits one table cell on backtick spans. Text outside the spans is kept as written. */
function toSegments(cell: string): WrittenSegment[] {
  return cell
    .split('`')
    .map((text, i) => ({ text, code: i % 2 === 1 }))
    .filter((s) => s.text !== '');
}

/** Rows of the 'What gets written' table in a README, in file order. */
export function parseWritten(readme: string): WrittenRow[] {
  const start = HEADING.exec(readme);
  if (!start) throw new Error("README has no 'What gets written' section");
  const rest = readme.slice(start.index + start[0].length);
  const next = /^##[ \t]/m.exec(rest);
  const section = next ? rest.slice(0, next.index) : rest;
  const rows = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
  // Drop the header row and the |---|---| divider.
  const body = rows.slice(2);
  if (body.length === 0) throw new Error("'What gets written' table has no rows");
  return body.map(([choice, written]) => {
    if (!choice || !written) throw new Error(`Malformed row in 'What gets written': ${choice}`);
    return { choice, segments: toSegments(written) };
  });
}

export function getWrittenRows(): WrittenRow[] {
  return parseWritten(fs.readFileSync(path.resolve('content/README.md'), 'utf8'));
}

/** Every path the table lists, once, in file order. */
export function writtenPaths(rows: WrittenRow[]): string[] {
  return [...new Set(rows.flatMap((r) => r.segments.filter((s) => s.code).map((s) => s.text)))];
}

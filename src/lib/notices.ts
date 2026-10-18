import fs from 'node:fs';
import path from 'node:path';

export interface Notice {
  /** File name as in the kit, for example NOTICE-superpowers.md. */
  file: string;
  /** Anchor id, the file name without extension in lower case. */
  id: string;
  /** File content, unmodified. */
  text: string;
}

const NOTICE_DIR = ['catalog-data', 'skills'];

/** Every NOTICE-*.md of the synced kit content, in file name order. */
export function readNotices(root = path.join(process.cwd(), 'content')): Notice[] {
  const dir = path.join(root, ...NOTICE_DIR);
  return fs
    .readdirSync(dir)
    .filter((f) => /^NOTICE-.+\.md$/.test(f))
    .sort()
    .map((file) => ({
      file,
      id: file.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      text: fs.readFileSync(path.join(dir, file), 'utf8'),
    }));
}

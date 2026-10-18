import fs from 'node:fs';
import path from 'node:path';

/** The `[repository](url)` link of a README: the only contact target the kit's files give. */
export function parseRepositoryUrl(readme: string): string {
  const match = /\[repository\]\((https:\/\/[^)\s]+)\)/.exec(readme);
  if (!match) throw new Error("README has no '[repository](https://...)' link");
  return match[1];
}

export function getRepositoryUrl(root = path.join(process.cwd(), 'content')): string {
  return parseRepositoryUrl(fs.readFileSync(path.join(root, 'README.md'), 'utf8'));
}

import fs from 'node:fs';
import path from 'node:path';
import {
  MANIFEST_NAME,
  contentDir,
  hashFiles,
  overallChecksum,
  SINGLE_FILES,
  selectSourceFiles,
  sourceDir,
} from './sync-lib.mjs';
import { FLOW_FILE, buildFlowFromContent, serializeFlow } from './flow-lib.mjs';
import { REPLAY_FILE, buildReplayFromContent, hasReplayInputs, serializeReplay } from './replay-lib.mjs';

const src = sourceDir();
const dir = contentDir();

if (!fs.existsSync(src)) {
  console.error(`sync: KIT_SOURCE not found: ${src}`);
  process.exit(1);
}

const rels = selectSourceFiles(src);
const missing = SINGLE_FILES.filter((rel) => !rels.includes(rel));
if (missing.length > 0) {
  console.error(`sync: required kit files missing under ${src}: ${missing.join(', ')}`);
  process.exit(1);
}

// Build in a sibling directory and swap it in, so a failed copy never empties content/.
const tmp = `${dir}.tmp`;
fs.rmSync(tmp, { recursive: true, force: true });
for (const rel of rels) {
  const dest = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(src, rel), dest);
}

const files = hashFiles(tmp, rels);
const manifest = { files, checksum: overallChecksum(files) };
fs.writeFileSync(path.join(tmp, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
fs.rmSync(dir, { recursive: true, force: true });
fs.renameSync(tmp, dir);
if (hasReplayInputs()) {
  fs.mkdirSync(path.dirname(REPLAY_FILE), { recursive: true });
  fs.writeFileSync(REPLAY_FILE, serializeReplay(buildReplayFromContent(dir)));
  fs.writeFileSync(FLOW_FILE, serializeFlow(buildFlowFromContent(dir)));
}
console.log(`sync: copied ${rels.length} files from ${src} (checksum ${manifest.checksum})`);

import fs from 'node:fs';
import { REPLAY_FILE, buildReplayFromContent, hasReplayInputs, serializeReplay } from './replay-lib.mjs';
import { contentDir, findDrift, sourceDir } from './sync-lib.mjs';

const problems = findDrift(sourceDir(), contentDir());
// The hero replay data is derived from content/; it must match a fresh derivation.
if (hasReplayInputs()) {
  const want = serializeReplay(buildReplayFromContent(contentDir()));
  if (!fs.existsSync(REPLAY_FILE) || fs.readFileSync(REPLAY_FILE, 'utf8') !== want) {
    problems.push(`${REPLAY_FILE} is stale or missing`);
  }
}
if (problems.length > 0) {
  console.error('check:sync failed, content is out of sync with KIT_SOURCE:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('Run npm run sync and commit content/.');
  process.exit(1);
}
console.log('check:sync ok');

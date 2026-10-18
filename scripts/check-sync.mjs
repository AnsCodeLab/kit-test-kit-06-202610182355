import { contentDir, findDrift, sourceDir } from './sync-lib.mjs';

const problems = findDrift(sourceDir(), contentDir());
if (problems.length > 0) {
  console.error('check:sync failed, content is out of sync with KIT_SOURCE:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('Run npm run sync and commit content/.');
  process.exit(1);
}
console.log('check:sync ok');

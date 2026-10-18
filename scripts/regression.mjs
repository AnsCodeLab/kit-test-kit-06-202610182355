// npm run test:regression: builds dist/ when it is missing (CI runs this step before the Build step),
// makes sure chromium is present, then runs the site-wide regression suite against the served dist/.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!fs.existsSync('dist/index.html')) run('npm', ['run', 'build']);
run('node', ['scripts/ensure-browser.mjs']);
run('npx', ['playwright', 'test', '-c', 'playwright.regression.config.ts']);

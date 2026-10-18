// Makes sure the Playwright chromium build is present (no-op when it already is).
// CI runners start without browsers, so the browser scripts call this first.
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
process.exit(r.status ?? 1);

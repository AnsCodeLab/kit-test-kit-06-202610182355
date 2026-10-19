// Runs Lighthouse on the 11 audited pages (scripts/audit-pages.mjs) of the served dist/ build and asserts performance and accessibility >= 90.
// Uses BASE_URL when set (CI serves dist/ itself); otherwise serves dist/ on a local port.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { builtPages } from './pages.mjs';
import { auditPages } from './audit-pages.mjs';

const MIN = 0.9;
const MAX_CLS = 0.05;
let server;
let base = process.env.BASE_URL;
if (!base) {
  const port = 4180;
  server = spawn('node', ['scripts/serve.mjs', 'dist', String(port)], { stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      await sleep(200);
    }
  }
}

const chrome = await launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
let failed = false;
try {
  const built = new Set(builtPages());
  for (const page of auditPages) {
    if (!built.has(page)) {
      console.log(`FAIL ${page} is not in dist/`);
      failed = true;
      continue;
    }
    const result = await lighthouse(base + page, { port: chrome.port, onlyCategories: ['performance', 'accessibility'], output: 'json', logLevel: 'error' });
    for (const id of ['performance', 'accessibility']) {
      const score = result.lhr.categories[id].score ?? 0;
      const ok = score >= MIN;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${page} ${id}: ${Math.round(score * 100)}`);
      if (!ok) failed = true;
    }
    const cls = result.lhr.audits['cumulative-layout-shift'].numericValue ?? 1;
    const clsOk = cls <= MAX_CLS;
    console.log(`${clsOk ? 'PASS' : 'FAIL'} ${page} cumulative-layout-shift: ${cls.toFixed(3)}`);
    if (!clsOk) failed = true;
  }
} finally {
  chrome.kill();
  server?.kill();
}
process.exit(failed ? 1 : 0);

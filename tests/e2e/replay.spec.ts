import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const replay = JSON.parse(fs.readFileSync('src/data/replay.json', 'utf8')) as typeof import('../../src/data/replay.json');


// Every revealed row is fully visible (clip-path none or inset(0)) and no animation is running.
async function assertFinalFrame(page: import('@playwright/test').Page) {
  const state = await page.evaluate(() => {
    const fig = document.querySelector('[data-replay]')!;
    return {
      anims: fig.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      clipped: [...fig.querySelectorAll('.reveal')].filter(
        (e) => !/^(none|inset\((0(px|%)?[ )]*)+)$/.test(getComputedStyle(e).clipPath),
      ).length,
    };
  });
  expect(state.anims).toBe(0);
  expect(state.clipped).toBe(0);
  for (const s of replay.steps) await expect(page.locator('[data-replay] .steps')).toContainText(s.label, { ignoreCase: true });
}

test.describe('motion allowed', () => {
  test('runs, finishes within 8 s, then holds the final frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const total = await page.evaluate(() => {
      const anims = document.querySelector('[data-replay]')!.getAnimations({ subtree: true });
      return Math.max(...anims.map((a) => (a.effect!.getComputedTiming().endTime as number)));
    });
    expect(total).toBeGreaterThan(3000);
    expect(total).toBeLessThanOrEqual(8000);
    const early = await page.evaluate(() => document.querySelector('[data-replay]')!.getAnimations({ subtree: true }).length);
    expect(early, 'animations are running at load').toBeGreaterThan(0);
    await page.waitForTimeout(total + 300);
    await assertFinalFrame(page);
    const a = await page.locator('[data-replay]').screenshot();
    await page.waitForTimeout(1000);
    expect((await page.locator('[data-replay]').screenshot()).equals(a), 'frame holds').toBe(true);
  });

  test('Replay restarts the timeline', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('[data-replay]')!.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'));
    await page.getByRole('button', { name: 'Replay' }).click();
    const running = await page.evaluate(() => document.querySelector('[data-replay]')!.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
    expect(running).toBeGreaterThan(0);
    expect(await page.locator('[data-replay].is-reset').count()).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test('shows the final frame at once, nothing moves, no Replay button', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await assertFinalFrame(page);
    await expect(page.getByRole('button', { name: 'Replay' })).toBeHidden();
  });
});

test.describe('JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });
  test('shows the final frame at once and nothing moves', async ({ page }) => {
    await page.goto('/');
    await assertFinalFrame(page);
    await expect(page.locator('[data-install] code')).toHaveText(replay.command);
  });
});

test('text alternative: the scene is real text, every step and file is readable', async ({ page }) => {
  await page.goto('/');
  const fig = page.locator('figure[data-replay]');
  await expect(fig).toHaveAttribute('aria-labelledby', 'replay-title');
  await expect(page.locator('#replay-title')).toContainText('example run');
  await expect(fig.locator('ol.steps > li')).toHaveCount(replay.steps.length);
  for (const f of replay.files) await expect(fig.locator('ul.files')).toContainText(f.path);
  expect(await fig.locator('svg:not([aria-hidden="true"])').count()).toBe(0);
});

test('scene is small, install command and copy button stay on the first screen', async ({ page, viewport }) => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  const scene = /<figure[^>]*data-replay[\s\S]*?<\/figure>/.exec(html)![0];
  expect(Buffer.byteLength(scene)).toBeLessThan(40 * 1024);
  await page.goto('/');
  const h = viewport!.height;
  for (const loc of [page.locator('[data-install] code'), page.locator('[data-install] button')]) {
    const box = (await loc.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(h);
  }
  const fig = (await page.locator('[data-replay]').boundingBox())!;
  expect(fig.y).toBeLessThan(h);
});

test('Home transfers under 300 KB including fonts', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (res) => {
    const len = Number((await res.allHeaders())['content-length'] ?? 0);
    bytes += len || (await res.body().catch(() => Buffer.alloc(0))).length;
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  expect(bytes).toBeLessThan(300 * 1024);
});

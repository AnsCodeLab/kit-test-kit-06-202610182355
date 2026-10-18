import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const URL = '/fixture/components';
const COMMAND = 'npx @anscodelab/coding-agent-kit';

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(URL);
});

test('renders the command text exactly', async ({ page }) => {
  await expect(page.locator('[data-install] code')).toHaveText(COMMAND);
});

test('click copies the exact command to the clipboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Copy command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMMAND);
});

test('keyboard: Tab reaches the button, Enter and Space both activate it', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Copy command' });
  const status = page.locator('[data-install] [role=status]');
  await page.locator('[data-install]').scrollIntoViewIfNeeded();
  for (let i = 0; i < 20 && !(await button.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(button).toBeFocused();

  await page.evaluate(() => navigator.clipboard.writeText('x'));
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMMAND);
  await expect(status).not.toHaveText('');

  await page.evaluate(() => navigator.clipboard.writeText('x'));
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMMAND);
});

test('button is at least 44 x 44 px', async ({ page }) => {
  const box = await page.getByRole('button', { name: 'Copy command' }).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('status is an aria-live=polite region, empty before and non-empty after activation', async ({ page }) => {
  const status = page.locator('[data-install] [aria-live="polite"]');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText('');
  const button = page.locator('[data-install] button');
  await expect(button).toHaveAccessibleName('Copy command');
  await button.click();
  await expect(status).not.toHaveText('');
  await expect(button).toHaveText('Copied');
  await expect(button).toHaveAccessibleName('Copied');
});

test('fallback: selects the command and still reports when the clipboard API is missing', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    document.execCommand = () => true;
  });
  await page.getByRole('button', { name: 'Copy command' }).click();
  await expect(page.locator('[data-install] [role=status]')).not.toHaveText('');
  expect(await page.evaluate(() => getSelection()!.toString())).toBe(COMMAND);
});

test('RepoTree lists the written paths', async ({ page }) => {
  const paths = await page.locator('dl.tree code').allTextContents();
  expect(paths).toEqual(expect.arrayContaining(['.mcp.json', '.claude/skills/', '.git/hooks/pre-commit']));
});

test('axe: 0 violations and no horizontal scroll', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('one script only, and its JavaScript is at most 2 KB gzipped', async ({ page }) => {
  const scripts = await page.locator('script').evaluateAll((els) => els.map((e) => ({ src: e.getAttribute('src'), inline: e.textContent })));
  expect(scripts).toHaveLength(1);
  const html = fs.readFileSync('dist-fixture/fixture/components/index.html', 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const sources = [...srcs.map((s) => fs.readFileSync(path.join('dist-fixture', s), 'utf8')), ...inline];
  const total = sources.reduce((n, s) => n + zlib.gzipSync(s).length, 0);
  expect(total).toBeLessThanOrEqual(2048);
});

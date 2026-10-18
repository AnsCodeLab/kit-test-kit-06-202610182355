import { test, expect } from '@playwright/test';

test('/ responds 200 with lang, title, one h1 and one main', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await page.title()).trim()).not.toBe('');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
});

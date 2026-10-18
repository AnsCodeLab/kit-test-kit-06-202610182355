import { test, expect } from '@playwright/test';
import { auditPage } from './audit';
import { allPaths, NOT_FOUND_PATH } from './pages';

const routes = allPaths();

for (const route of routes) {
  test(`${route} meets the site-wide bars`, async ({ page, baseURL }) => {
    const { violations } = await auditPage(page, new URL(route, baseURL).href);
    expect(violations).toEqual([]);
  });
}

test('404 page meets the site-wide bars', async ({ page, baseURL }) => {
  const { violations } = await auditPage(page, new URL(NOT_FOUND_PATH, baseURL).href, { expectStatus: 404 });
  expect(violations).toEqual([]);
});

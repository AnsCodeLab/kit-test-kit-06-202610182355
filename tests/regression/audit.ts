// Page audit shared by the regression specs. auditPage() loads one URL and returns every
// measurable-bar violation it finds as a readable string; an empty list means the page passes.
import type { Page } from '@playwright/test';

export interface AuditResult {
  status: number;
  violations: string[];
}

// Runs inside the browser. Returns violations for the DOM-level bars.
function domChecks(): string[] {
  const out: string[] = [];
  const html = document.documentElement;
  if (!html.getAttribute('lang')?.trim()) out.push('html has no lang attribute');
  if (!document.title.trim()) out.push('title is empty');

  const h1s = document.querySelectorAll('h1').length;
  if (h1s !== 1) out.push(`expected exactly one h1, found ${h1s}`);

  let prev = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const level = Number(h.tagName.slice(1));
    if (level > prev + 1) out.push(`heading level skipped: h${prev || 0} then h${level} ("${h.textContent?.trim().slice(0, 40)}")`);
    prev = level;
  }

  for (const sel of ['header', 'nav', 'footer']) {
    if (!document.querySelector(sel)) out.push(`missing <${sel}> landmark`);
  }
  const mains = document.querySelectorAll('main').length;
  if (mains !== 1) out.push(`expected exactly one <main>, found ${mains}`);

  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.push(`img without alt attribute: ${img.getAttribute('src')}`);
  }

  // Interactive elements must be at least 44 x 44 px. The one exemption is an inline text link inside
  // running prose: a display:inline anchor whose block parent also holds other text. Lists of links,
  // nav items and standalone links are not prose and are measured.
  const interactive = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll<HTMLElement>(interactive)) {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (style.visibility === 'hidden' || style.display === 'none' || (box.width === 0 && box.height === 0)) continue;
    if (el.tagName === 'A' && style.display === 'inline') {
      const parent = el.closest('p, li, dd, dt, td, blockquote, figcaption');
      const own = el.textContent ?? '';
      if (parent && (parent.textContent ?? '').replace(own, '').trim().length > 0) continue;
    }
    if (box.width < 44 || box.height < 44) {
      const label = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40);
      out.push(`target ${Math.round(box.width)}x${Math.round(box.height)} px is under 44x44: <${el.tagName.toLowerCase()}> "${label}"`);
    }
  }

  if (html.scrollWidth > window.innerWidth) {
    out.push(`horizontal scroll: scrollWidth ${html.scrollWidth} > viewport ${window.innerWidth}`);
  }
  return out;
}

export async function auditPage(page: Page, url: string, opts: { expectStatus?: number } = {}): Promise<AuditResult> {
  const origin = new URL(url).origin;
  const expectStatus = opts.expectStatus ?? 200;
  const violations: string[] = [];
  const foreign: string[] = [];
  const consoleErrors: string[] = [];

  page.on('request', (req) => {
    const u = req.url();
    if (/^(data|blob|about):/.test(u)) return;
    if (new URL(u).origin !== origin) foreign.push(u);
  });
  page.on('pageerror', (err) => consoleErrors.push(`uncaught: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // A 404 page makes the browser log its own failed document load; that is the expected status, not a page error.
    if (expectStatus !== 200 && msg.location().url === url && /Failed to load resource/.test(msg.text())) return;
    consoleErrors.push(msg.text());
  });

  const response = await page.goto(url, { waitUntil: 'networkidle' });
  const status = response?.status() ?? 0;
  if (status !== expectStatus) violations.push(`status ${status}, expected ${expectStatus}`);

  violations.push(...(await page.evaluate(domChecks)));
  for (const f of foreign) violations.push(`request to another origin: ${f}`);
  for (const c of consoleErrors) violations.push(`console error: ${c}`);

  const cookies = await page.context().cookies();
  const docCookie = await page.evaluate(() => document.cookie);
  if (cookies.length > 0 || docCookie) violations.push(`cookies set: ${cookies.map((c) => c.name).join(', ') || docCookie}`);

  return { status, violations };
}

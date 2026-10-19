# Coding Agent Kit test run 06

Marketing site for the Coding Agent Kit, built through the ticket pipeline. See docs/PRD.md.

Astro, static output only (no server code, no adapter). The build needs no secret and no network.

## Layout

- `src/` pages, layouts, components, styles
- `content/` synced data and Markdown
- `scripts/` helper scripts (static server, Lighthouse runner)
- `tests/` unit (`tests/unit`) and end-to-end (`tests/e2e`)
- `docs/` working documents

## Site URL

`npm run build` writes `dist/sitemap.xml` and points the `Sitemap:` line of `dist/robots.txt` at the origin in the `SITE_URL` environment variable. When `SITE_URL` is not set it uses the placeholder `https://example.invalid`, which is not a real address. Set `SITE_URL` (for example `SITE_URL=https://www.example.com npm run build`) before building the site that is deployed.

## Commands

Install with `npm ci`. The browser commands download Playwright chromium on first use.

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | Static build into `dist/` |
| `npm run lint` | ESLint, then `astro check` |
| `npm run scan:secrets` | Offline secret scan of the working tree and git history (allowlist: `scripts/secret-scan-allowlist.txt`, a reason on every entry) |
| `npm run healthcheck [url]` | Proves a served site is up: every sitemap page (200, text/html, title, one h1), `/robots.txt`, `/sitemap-index.xml` (skipped when 404) and an unknown path (404); security headers are required on non-local targets. Target is the argument or `HEALTH_URL`; with neither, it serves `dist/` itself. Exits 1 and names the first failure class. |
| `npm run audit` | `npm audit` on production dependencies, fails on high or critical |
| `npm test` | Unit tests (Vitest) |
| `npm run test:smoke` | Playwright smoke test on the served `dist/` at 375, 768 and 1440 px |
| `npm run test:a11y` | axe on every built page at 375, 768 and 1440 px; colour contrast of links and buttons in hover, focus-visible and active states and CLS (including the font fallback metrics) on the 11 audited pages at 375 and 1440 px |
| `npm run test:regression` | Site-wide bars on every page in the sitemap plus 404 at 375, 768 and 1440 px (status, lang, title, h1, headings, landmarks, alt, external requests, cookies, console errors, horizontal scroll, 44 px targets, internal links), then Home size and CLS and the font budget. Builds `dist/` first when it is missing. Negative tests prove it fails on broken HTML. |
| `npm run lighthouse` | Lighthouse on the 11 audited pages (`scripts/audit-pages.mjs`), asserts performance and accessibility >= 90 and CLS <= 0.05, prints each score |
| `npm run preview` | Serve `dist/` on http://127.0.0.1:4173 |

The browser commands need `npm run build` first. They use the server at `BASE_URL` when set, otherwise they serve `dist/` themselves.

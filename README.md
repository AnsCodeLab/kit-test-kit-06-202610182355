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
| `npm test` | Unit tests (Vitest) |
| `npm run test:smoke` | Playwright smoke test on the served `dist/` at 375, 768 and 1440 px |
| `npm run test:a11y` | axe on every built page at 375, 768 and 1440 px |
| `npm run lighthouse` | Lighthouse on every built page, asserts performance and accessibility >= 90 |
| `npm run preview` | Serve `dist/` on http://127.0.0.1:4173 |

The browser commands need `npm run build` first. They use the server at `BASE_URL` when set, otherwise they serve `dist/` themselves.

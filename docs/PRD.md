# PRD: Marketing website for the Coding Agent Kit

Status: approved input for the build. Owner: product owner (human). Audience of this document: the team that plans and builds the site, which is a set of AI coding agents working through tickets. This is an ASSUMED project used to test the kit: take the requirements as given and do not question the business model.

## 1. Purpose

Build a static marketing website that explains and sells the **Coding Agent Kit** (`@anscodelab/coding-agent-kit`, run with `npx @anscodelab/coding-agent-kit`). The kit is a free, MIT-licensed command-line setup wizard that writes the configuration an AI coding agent needs into a repository: skills, rules, MCP servers and safeguard hooks. Around the free tool there is a paid offer (section 4). The site must make a visitor understand what the kit does in about 30 seconds, let them install it, and let a team lead see what they would pay for.

## 2. Goals and non-goals

Goals
1. A visitor can read the value proposition, see the exact install command, copy it, and understand what the command changes in their repo.
2. An engineer can browse what the kit contains (57 skills in four groups) and follow a quickstart.
3. A team lead can see the paid offer and how to ask for it.
4. The site looks like a modern developer-product site (section 6) and is fast, accessible and responsive.
5. The whole site is built, reviewed, tested and deployed through the ticket pipeline, not by hand.

Non-goals (this release)
- No server-side code, forms that post data, payments, accounts, analytics, cookies or third-party scripts.
- No blog, no localisation, no search.

## 3. Audience

- **Engineers** who want a good agent setup now: they scan for the command, the files it writes, and proof it is safe.
- **Engineering leads** who decide for a team: they read more slowly and want evidence, scope, licence and what the paid offer includes.

## 4. The offer (informational only; nothing is purchasable on the site)

- **Free:** the CLI and the 57 skills (MIT).
- **Pro Pack (planned):** private skills, templates and team policy presets delivered under a licence key.
- **Services:** team onboarding, setup for your repositories, priority support.
Pricing is a placeholder: show a short line that asks about the plan (for example "Ask about the Pro Pack") and a short description. Do not invent prices, customers, logos, testimonials, ratings or statistics.

## 5. Content

Real content only. The sources of truth are the kit's own files, which the site copies into its repository as Markdown or data and keeps in sync: the skill catalogue (`catalog-data/skills.yaml` and its skills), the handbook chapters (`handbook/*.md`), the README, the licence notices (`THIRD-PARTY.md`, `catalog-data/skills/NOTICE-*.md`).

**Source material.** The kit's source files are available read-only inside the build environment at `/source`, and only there (nothing else of the kit repository exists). The five paths:
- `/source/catalog-data` (the catalogue: `skills.yaml`, the skill folders with their `NOTICE-*.md`, hooks, MCP, agents and templates)
- `/source/handbook` (the handbook chapters, `*.md`)
- `/source/README.md`
- `/source/THIRD-PARTY.md`
- `/source/LICENSE`

The sync script reads from `/source`; the path is configurable with the environment variable `KIT_SOURCE` (default `/source`). CI runs in the same environment, so `/source` exists there as well; it is an absolute path and does not depend on the checkout. Do not read the kit from any other location and do not use the network. Proof means real artefacts: real command output, the real file tree the kit writes, the real catalogue, the real licence notices. Never fabricate.

Required areas (the team decides the exact page list and how to split the work):
- Home: value proposition, install command with copy button, what lands in the repo, how it works, skills overview, offer teaser, calls to action.
- Product: what the kit contains, grouped skills with counts and one-line purposes.
- Docs: quickstart and concept pages derived from the handbook.
- Offer: Pro Pack and Services described, with a contact call to action.
- About and trust: licence, what the CLI never does (no network calls, no credentials written, no overwrite of your own files), third-party notices.
- Legal and housekeeping pages a real site needs (licence, privacy statement that says no data is collected, 404, robots, sitemap).

## 6. UX and UI direction

This is an **open design brief**. The product owner does not prescribe a layout, a palette or a reference site. The team designs the site, and the design is judged by a person looking at it: it must not look like a template.

Binding requirements
- The required areas in section 5 exist, with real content only. Their order, page structure and the layout of every page are the team's choice. The home page does not have to follow a fixed section order, and it does not have to contain a dark hero, a terminal card, tabs, a trust strip or a closing band; use one only if the chosen design needs it.
- The home page shows the install command (`npx @anscodelab/coding-agent-kit`) with a working copy button, and what the command writes into a repo, above the fold or one scroll down.
- Visual direction is chosen with the `ui-style-direction` skill: at least **three** directions that differ in layout (not only in colour), recorded in `docs/design-direction.md` with a short rationale, one chosen and why. The team picks without waiting for the owner; the owner reviews the choice at the end.
- Web fonts are allowed, **self-hosted** only (woff2 files committed to the repo or installed from npm at build time, no request to a font service at runtime), at most 3 files, subsetted, at most 150 KB in total, with `font-display: swap` and a metric-matched fallback so there is no layout shift.
- Imagery is allowed and expected where it helps: illustrations, diagrams, icons and screenshots the team creates itself (inline SVG, SVG or optimised PNG/WebP files). No stock photos, no third-party assets, no copied artwork. Every image has meaningful alt text, or empty alt if decorative. Product visuals must be real: for example a recorded or accurately reproduced run of the CLI and the file tree it writes.
- Define design tokens (colour, type scale, spacing scale, radii, shadows, motion) before building pages; every page uses the tokens. Colour choices are checked for AA contrast.
- Motion is subtle and respects `prefers-reduced-motion`.
- Before release, run the `ui-review` skill on the built site and fix every P1 and P2 item.

Quality bars (measured)
- WCAG AA contrast on every text and control; keyboard operable; visible focus; semantic headings and landmarks; alt text on every image; touch targets at least 44 px.
- Works at 375, 768 and 1440 px with no horizontal scroll and no clipped text.
- Lighthouse performance and accessibility 90 or higher; Home page under 300 KB excluding images (fonts count); no layout shift on load.

## 7. Architecture

- Static site generated with **Astro** (static output, no server code), content collections for docs and the skill catalogue, Markdown/MDX for pages, a small amount of plain CSS driven by the design tokens, and the smallest possible amount of JavaScript (copy button, tab behaviour).
- Content sync: a script copies the needed content from `KIT_SOURCE` (default `/source`, see section 5) into the site repository (`content/`) and records a checksum of the copied sources; a check fails the build when the copy has drifted from the source.
- Repository layout the team should follow: `src/` (pages, layouts, components, styles), `content/` (synced data and Markdown), `scripts/` (sync and checks), `tests/` (unit and end-to-end), `docs/` (working documents).
- npm scripts the pipeline relies on: `build`, `test`, `test:smoke` (Playwright against the served build), `test:a11y` (axe), `lighthouse`, and the ones the tickets add (`test:regression`, `healthcheck`, `scan:secrets`, `audit`).
- Hosting-neutral output: the build produces a plain `dist/` that any static host serves from the root path.

## 8. Repository and delivery process

- The code lives in its own **private GitHub repository** under the `AnsCodeLab` account, created at the start of the project by the pipeline (one repository per project run), with `main` as the default branch.
- Work is trunk-based: **one branch and one pull request per ticket**, branched from `main`, merged only through the pipeline. Branch names start with the ticket key.
- Every commit subject and every PR title follows `KEY-123 - description` with the Jira ticket key (for example `AKC-213 - Implement login`); one ticket key per PR.
- Tickets live in a Jira project created for the run (a Jira project per run). The ticket key is how commits, PRs and Jira are linked. A ticket's acceptance criteria are what the automated QA gate checks.
- Every pull request runs the pipeline: commit lint, CI (install, lint, unit tests, build, smoke test, accessibility check, Lighthouse), a cross-model code review, and for user-visible work an automated QA gate that judges the served pages from screenshots and facts. A pull request merges only when these pass.
- Commits made by AI agents carry audit trailers and use the configured git identity.

## 9. Deployment

- Host: **Cloudflare Pages**, direct upload of the built `dist/` (no Git integration needed), one Pages project for all runs with a preview URL per run.
- The pipeline deploys after the work is merged and reports the live URL. Production domain and DNS are out of scope for this release.
- A release is a tagged, reproducible build of `main` with a short rollback note (how to redeploy the previous build) and a health-check script that fetches the pages.

## 10. Success criteria for the release

1. Every required area in section 5 exists as a live page, with real content only.
2. The look follows section 6: a deliberate design direction chosen from at least three layout-different options and recorded, consistent tokens, real product visuals, and a `ui-review` pass with no open P1 or P2 item.
3. All measured quality bars in section 6 pass on every page.
4. The repository, branching, commit and PR rules in section 8 were followed throughout.
5. The site is deployed to Cloudflare Pages and reachable.
6. Security basics: security headers file, a secret scan and a dependency audit in CI, licence and third-party notices page.

## 11. Constraints and risks

- Scope is the static site only. Offer pages are informational.
- No invented proof of any kind. If a fact is not in the kit's files, do not state it.
- Contrast and mobile layout are the likeliest failures: check them on real screenshots, not by assumption.
- The site must not depend on any service that needs a secret at build time.

## 12. How the work is organised

This PRD does not list tickets. The first ticket after the scaffold is the design direction (section 6); pages are built after it, using its tokens. The team reads it, breaks it down into epics and tickets with acceptance criteria that can be checked from the served pages, the CI results and the page facts, orders them by dependency, and executes them through the pipeline in section 8. A ticket's acceptance criteria must be observable from a rendered page, the CI step results, or measurable page facts (language, title, headings, landmarks, alt text, status codes), because the automated QA gate sees only those.

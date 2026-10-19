# Design direction

Decision record for KRK06-3. Page tickets follow this file and `src/styles/tokens.css`; do not invent a second look.

## Facts only this product has

- The headline object is one real command: `npx @anscodelab/coding-agent-kit`.
- The kit writes files into a repo, and says exactly which: `CLAUDE.md` or `AGENTS.md` (inside a delimited section), `.claude/skills/` or `.agents/skills/`, `.mcp.json`, `.vscode/extensions.json`, `.orca/config.yaml`, `.git/hooks/pre-commit`, `.claude/statusline.sh`.
- It is not a runtime: it writes files and exits. It never touches the network and never writes credentials.
- It never overwrites text outside its own `<!-- enclave-agent-kit:... -->` markers, and re-running changes nothing.
- 57 skills in four groups, bundles `core`, `tickets`, `ui`, `maintenance`, `architecture`, `everything`.
- Free (MIT), with a planned Pro Pack and services.

## Category default (the baseline to leave)

A developer tool usually gets a dark hero, a centred headline over a glowing terminal card, one bright accent, a trust strip, three feature cards, numbered steps and a repeated install band. Top bar with a filled button.

## Directions

### Direction A: Rail

Layout skeleton: a permanent left rail (about 15rem) holds the wordmark and the section index as a vertical list; content sits in a single reading column to its right, headline at the top of that column, section order follows the rail. On narrow screens the rail collapses into a disclosure menu. Hero object: the install command set as plain large text. Navigation model: vertical, always visible, documentation-site style. Style: Swiss/International. Type: grotesk with a mono for labels. Colour logic: white and graphite with one blue accent and an amber state hue. Outside reference: a printed railway timetable (column index on the margin, dense rows). Cost: needs JavaScript or a disclosure for the mobile menu, and a marketing page reads as documentation.

### Direction B: Console

Layout skeleton: centred headline over a dark full-bleed hero with a terminal card showing the run, a trust strip below, then feature cards, numbered steps, an install band, footer. Top bar navigation with a filled call-to-action button. Hero object: terminal window. Style: dark mode with accent glow. Type: sans display with mono. Colour logic: near-black and one green. Outside reference: a stage lighting rig. **Rejected:** it is the category default, so it only polishes what every developer tool already looks like.

### Direction C: Manifest

Layout skeleton: a ruled path bar on top is the whole navigation (`coding-agent-kit  /product  /docs  /offer  /about`, mono labels, active route underlined). Below it the page is a manifest: full-width rows separated by hard rules, each row a two-column split with a narrow label gutter (left) and the content (right), the way a file listing or a diff reads. The headline is the command itself, left-aligned and large, with the file tree it writes as the row directly under it rather than a terminal card. Order is chosen by the page, not fixed. Footer is a single dark band. Hero object: the real file tree. Navigation model: a horizontal path bar that wraps on narrow screens, no menu to open. Style: editorial grid with hard rules, light paper surface. Type: Hanken Grotesk for text and JetBrains Mono for paths, commands and labels. Colour logic: neutral paper and graphite, one vermilion accent for action and the active route, one teal as the second hue for state and emphasis (never for the primary action). Outside reference: a ship's cargo manifest (ruled rows, label column, tallies): take its grid and rhythm, not its surface.

## Choice

**Direction C, Manifest, is chosen.** Reasons:

1. The product is "files written into your repo". A manifest of rows with a label gutter shows that directly, and the file tree can be the hero, so the signature device is made of real content, not a mock-up.
2. Engineers scan for the command and the files; leads read slowly. Ruled rows give both a scannable gutter and a long-form reading column.
3. It needs no JavaScript for navigation and works at 375 px (the path bar wraps), unlike A.
4. It leaves the category default in two named ways: light paper base instead of a dark hero, and the file tree plus left-aligned command instead of a centred headline over a terminal card. It also breaks the section template structurally: no hero band, no trust strip, no feature-card trio, no repeated install band.

Signature device: the real file tree the command writes, set in mono inside the rows. Page tickets must not add glow gradients, pill-chip rows, icon grids, or a second install band.

## Tokens

All tokens live in `src/styles/tokens.css` as CSS custom properties. Pages use tokens, not literals.

| Group | Tokens |
|---|---|
| Colour: surface and text | `--color-bg` #f4f4f0, `--color-surface` #ffffff, `--color-ink` #17181a, `--color-ink-muted` #4f5358, `--color-rule` #82877d, `--color-rule-soft` #d6d7d0 |
| Colour: accent and second hue | `--color-accent` #b02f14 (action, active route), `--color-accent-ink` #ffffff, `--color-signal` #0b6262 (state, emphasis) |
| Colour: dark band | `--color-dark` #17181a, `--color-on-dark` #f4f4f0, `--color-on-dark-muted` #b9bdb5 |
| Colour: focus | `--color-focus` #0b57d0 (light), `--color-focus-on-dark` #ffd166 (dark band) |
| Type | `--font-sans` Hanken Grotesk, `--font-mono` JetBrains Mono, sizes `--text-xs` to `--text-3xl` (fluid, 13 px to 64 px), line heights `--leading-*`, weights 400 / 560 / 740 |
| Spacing | `--space-1` 4 px, 2 8, 3 12, 4 16, 5 24, 6 32, 7 48, 8 72, 9 112 |
| Radii | `--radius-0` 0 (default), `--radius-1` 2 px, `--radius-2` 6 px |
| Shadows | `--shadow-1` hard 1 px rule, `--shadow-2` 3 px hard offset in ink; no blurred shadows |
| Motion | `--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 360 ms, `--ease-standard`, `--ease-out`; all motion is disabled by `prefers-reduced-motion: reduce` |
| Focus | 3 px solid ring, 3 px offset, `--color-focus`; `--color-focus-on-dark` inside `.on-dark` |

## Fonts

Two self-hosted variable woff2 files in `public/fonts/`, subsetted to Basic Latin plus a few punctuation marks (from `@fontsource-variable/hanken-grotesk` and `@fontsource-variable/jetbrains-mono`, SIL OFL 1.1, licences beside the files). About 51 KB in total (limit: 3 files, 150 KB). Both `@font-face` rules use `font-display: swap`. Each has a metric-matched fallback face (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) computed from the glyph widths and line metrics against Arial / Courier New, so the swap does not shift layout. The sans fallback uses `size-adjust: 100.7%` with `ascent-override: 99.3%` and `descent-override: 30.1%` (the font's 1.000 and 0.303 em divided by the size adjustment); `tests/e2e/fonts-fallback.spec.ts` measures both fallbacks against the real faces. Both fonts are preloaded, so they normally arrive before first paint. The reading width `--measure` is 42.5rem (680 px), not `68ch`: `ch` follows the font in use, so a `ch` measure changed the line length, and re-wrapped paragraphs, at the swap.

## Contrast pairs

Measured with the WCAG 2.x relative luminance formula. The unit test `tests/unit/contrast.test.ts` reads this table, resolves each token from `tokens.css`, and fails if a pair drops below its minimum or if the measured value written here is wrong. Minimum 4.5 is normal text, 3 is large text and UI components (focus ring, rules).

States: `tests/e2e/contrast.spec.ts` measures every distinct link and button on the 11 audited pages (`scripts/audit-pages.mjs`) at 375 and 1440 px in rest, hover, active and focus-visible states (text 4.5:1, focus ring 3:1 against the surrounding background), and runs axe `color-contrast` on every built page. Hover keeps the text colour readable on its own background (links keep `--color-accent`; the button hover fill is `--color-ink` under `--color-accent-ink`). The direction is light only, so there is no dark variant to measure.

| Foreground token | Background token | Use | Min | Measured |
|---|---|---|---|---|
| `--color-ink` | `--color-bg` | body text | 4.5 | 16.11 |
| `--color-ink` | `--color-surface` | body text on cards | 4.5 | 17.77 |
| `--color-ink-muted` | `--color-bg` | secondary text | 4.5 | 7.03 |
| `--color-ink-muted` | `--color-surface` | secondary text on cards | 4.5 | 7.75 |
| `--color-accent` | `--color-bg` | links, active route | 4.5 | 5.84 |
| `--color-accent` | `--color-surface` | links on cards | 4.5 | 6.44 |
| `--color-signal` | `--color-bg` | state text | 4.5 | 6.48 |
| `--color-accent-ink` | `--color-accent` | text on accent fill | 4.5 | 6.44 |
| `--color-accent-ink` | `--color-ink` | text on button hover fill | 4.5 | 17.77 |
| `--color-on-dark` | `--color-dark` | footer text | 4.5 | 16.11 |
| `--color-on-dark-muted` | `--color-dark` | footer secondary text | 4.5 | 9.31 |
| `--color-rule` | `--color-bg` | rules, input borders (UI) | 3 | 3.33 |
| `--color-focus` | `--color-bg` | focus ring on page | 3 | 5.79 |
| `--color-focus` | `--color-surface` | focus ring on cards | 3 | 6.39 |
| `--color-focus-on-dark` | `--color-dark` | focus ring in footer | 3 | 12.32 |

## Round 2

Owner feedback on the finished site: "looks good but not really impressed". Round 1 was clean and consistent but timid. Round 2 raises the type and colour impact inside Manifest (same rows, rules, fonts and tokens), and adds the illustration layer from KRK06-24.

### Deviations from the developer-tool category default

1. **The command is the page, not a widget.** The default puts a small command in a terminal card under a centred headline. Here `npx @anscodelab/coding-agent-kit` is set as a display line (up to 7 rem, bold mono, tight tracking) that the Home hero is built around: two lines at 48 rem and up, four lines below that, sized from its container so it never overflows. At 1440 px it is about 6.6 times the body size, at 375 px about 3.1 times. The Home h1 sits above it at `--text-3xl`, and the band heading is a normal h2, so the command stays the top of the hierarchy.
2. **Page titles are poster-scale.** The default keeps a 40 px title. Every page `h1` now uses `--text-4xl` (40 px up to 84 px, tracking -0.035em), so each page opens with a typographic statement instead of a label.
3. **One full-bleed colour band, not a coloured card.** The default separates sections with cards and gradients. Home has a single edge-to-edge deep teal band for "How it works", with oversized mono numerals and ink-on-teal rules; every other section stays on paper. The band is painted with a clipped box shadow, so it needs no extra markup and cannot cause horizontal scroll.
4. **A strict accent budget.** The default sprinkles one bright accent over cards, icons and badges. Vermilion (`--color-accent`) appears only on: the primary action (buttons, links), the active route, the one word `agent-kit` in the display command, and the drawn strokes in the illustrations. Teal is for state and the band. Nothing else is saturated.

### Accent usage rule

Vermilion marks "do something here" or "you are here", plus one hero word. If an element is neither an action nor a location, it is ink, muted ink or teal. No glow, no gradients, no chip rows, no icon-card grids, no accent-border cards, no second install band.

### New tokens and contrast pairs

`--text-4xl`, `--text-display`, `--color-band`, `--color-on-band`, `--color-on-band-muted`. Checked by `tests/unit/contrast.test.ts` like the table above.

| Foreground token | Background token | Use | Min | Measured |
|---|---|---|---|---|
| `--color-on-band` | `--color-band` | text on the teal band | 4.5 | 8.37 |
| `--color-on-band-muted` | `--color-band` | secondary text on the teal band | 4.5 | 7.51 |
| `--color-focus-on-dark` | `--color-band` | focus ring on the teal band | 3 | 6.40 |

## Round 2 review

KRK06-26. Two checks on the built site (`npm run build`, served from `dist/`), then fixes.

### Cold reviewer test, with a control

Method: full-page screenshots at 1440 px with the header and footer product name hidden (the install command itself still names the package, because it is the content). Each screenshot went to a fresh reviewer subagent with no repo access and no context, one session per image, under neutral file names in a shuffled order (`shot-a` to `shot-g`). The control is a plain generic dev-tool page built from the same Home content (dark hero with a radial glow, centred headline, terminal card, pill chips, three icon cards, numbered steps, a repeated CTA band). The prompt, identical for all:

> Read ONLY the image file <path> (a full-page screenshot of a website, 1440 px wide). Do not read or list any other file and do not run any command. Answer in under 120 words: (1) What kind of product is this? (2) Which common website template or layout pattern does the page follow? (3) Name three real websites it resembles.

| Shot | Page | Template named | Sites named |
|---|---|---|---|
| a | Control | Standard dark-mode SaaS or developer-tool landing: sticky nav with CTA, centred glow hero, stat pills, three-column card grids, gradient CTA band | Vercel, Linear, Supabase |
| b | Home | Developer-tool landing built as a single-column "poster": giant monospace command, spec table, teal band, numbered points; brutalist and editorial | Vite, Astro, Zed |
| c | Product | Documentation or reference index in a narrow monospace column | Python docs index, awesome-list READMEs, Homebrew formulae |
| d | Docs | Documentation index with a ruled table of contents and a line-art illustration | Stripe Docs, Read the Docs, Vercel or Next.js Docs |
| e | Offer | Minimal editorial docs-style page with slash labels in a left gutter | Linear (changelog), Vercel (docs and pricing), Stripe Press |
| f | About | Minimal editorial page of ruled sections with quoted sources, terminal feel | Astro docs, Tailwind CSS, Linear changelog |

Verdicts:

- The control was judged the dark SaaS template, as it must be, so the reviewer discriminates.
- No page was judged to follow the control's template. None was called a generic or standard dark landing page. Pages d, e and f were described as editorial docs-style pages. The overlap in named sites with the control is limited to Vercel and Linear (their docs and changelog, not their landing pages), so on the skill's rule this passes on the template test and also passes the structure test: `checkStructure` reports `ok` with the default sequence (hero, facts, tabs, steps, install, offer, footer) dropped to its hero on every page, and `scanTells` totals are 0 on Home, Offer and About and 1 (`oneHueJobs`) on Product and Docs, never more than one.
- The weak finding was Home: the reviewer saw a text-only hero with half the width empty. That is fixed below, and Home was reviewed again (shot g, same prompt) after the fix: "developer-tool landing page ... monospace and brutalist-editorial ... resembles Vite, Astro, Bun". Still not the control's template or family.

### What the review changed

Home now has a hero drawing (`src/components/art/HomeArt.astro`) beside the headline: the command as a dark title bar over the seven kinds of file it writes, each marked with a teal `+`, closing with "everything else: untouched". Every path is from the README's "What gets written" table. It stays inside the direction: ink, paper, one vermilion rule, teal marks, a hard offset shadow, no gradients. Below 48 rem it sits under the display command so the command stays on the first screen. Between 48 and 64 rem it stays above the command, because moving it below made the display line's first-layout resize count as a shift of the art.

Each of the five main pages now has an inline SVG of at least 200 by 100 px that ends before the second viewport height at 1440 px: Home, Product, Docs, Offer and About. `tests/e2e/art.spec.ts` checks it.

### ui-review

Commands: `measure-page.cjs <url> <1440|768|375>` on the five pages (15 runs), `snapshot-page.cjs` with `scanTells` and `checkStructure`, `node /tmp/k26/lh.mjs` equivalent (Lighthouse on the five pages), `npm run lighthouse`, and screenshots at 1440 and 375.

```
## Items
- [P2] home-first-screen-no-visual | Home | 1440 | before the fix the only inline SVG of 200 px or more started at y=1734 (flow diagram) and the right 40 percent of the first screen was empty (screenshot fold-home.png); the cold reviewer saw a text-only hero | fixed: HomeArt.astro in the hero
- [P3] home-spec-stale | Home | all | tests/e2e/home.spec.ts fails on main before this ticket (9 failures: 'command, copy button and file tree within two viewports' expects dl.tree within two screens, and a '%' text match). It is not part of test:smoke, test:a11y or CI | not changed, out of scope for this ticket
- [P3] one-hue-jobs | Product, Docs | 1440 | scanTells oneHueJobs = 1 (total 1, allowed 1) | none
```

Measured and clean on all five pages at 1440, 768 and 375: axe 0, contrast failures 0, targets under 44 px 0, horizontal overflow false, console errors 0. Lighthouse on the five pages: performance 100, accessibility 100, best practices 100 (CLS 0.000 on the audited pages). Home HTML is 37 KB and the fonts are 67 KB.

Coverage: pages Home, Product, Docs, Offer, About (the other 70 built pages share the layout and were covered by axe and contrast in `test:a11y`, not reviewed visually); viewports 1440, 768, 375; states checked: replay terminal after scroll, reduced-motion and strokes (`art.spec.ts`), keyboard focus and hover contrast (`contrast.spec.ts`); not checked: Safari and Firefox rendering (Chromium only), a person's taste review (the cold reviewers are models and find sameness, not taste), the control for Product, Docs, Offer and About (one control built from Home content), 375 px screenshots in the cold test (1440 only).

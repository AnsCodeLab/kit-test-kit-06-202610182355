# UI review (KRK06-21)

Final visual and usability gate over the built site. Method: `npm run build`, `node scripts/serve.mjs dist 4173`, then the `ui-review` skill: `node .claude/skills/ui-review/scripts/measure-page.cjs <url> <width>` for each of the 12 page types at 375, 768 and 1440 px (36 runs), full-page screenshots at the three widths, a Tab-through of Home and Docs at 1440 px, and the regression suite. Chromium 1208 from the Playwright cache (`CHROME` set to it).

Pages: Home `/`, Product `/product`, skill page `/product/skills/brainstorming`, Docs index `/docs`, quickstart `/docs/quickstart`, long chapter `/docs/measuring-effectiveness`, Offer `/offer`, About `/about`, Licence `/license`, Third-party `/third-party`, Privacy `/privacy`, 404 `/404.html`.

## Findings

| ID | Page | Viewport | Issue | Priority | Status |
|---|---|---|---|---|---|
| focus-clipped | every page (header links) | 1440 | The focus ring on the first header link starts at y=0, so its top edge is cut off by the top of the viewport (screenshot `focus-docs.png`, Tab stop 3 on Docs). Evidence: ring width 3 px plus offset 3 px, link box top at 0. | P2 | Fixed: `Header.astro` adds `padding-block-start` of ring width plus offset. Tested by `tests/regression/ui-review.spec.ts`. |
| next-link-small | chapter `/docs/measuring-effectiveness` (and the other chapters with a "Next:" line) | 375, 768, 1440 | `measure-page.cjs` reports `smallTargets: 1`: the `7. FAQ` link in the "Next:" line is 49.7 x 22 px. It is a standalone pager line, not a link inside a sentence. | P2 | Fixed: `prose.css` gives a paragraph made of a bold label and one link a 44 px tall link. Tested by `ui-review.spec.ts`. |
| repo-link-404 | every page (footer "source on GitHub"), Offer and About (README links), Third-party | all | `measure-page.cjs` reports `brokenLinks: 1` on all 36 runs: `https://github.com/AnsCodeLab/Coding-Agent-Kit` answers 404 to an unauthenticated request (`gh repo view` says the repository is private). The link text and URL come from the kit source and the footer. | P3 | Open, needs the owner: it resolves when the repository is made public or the owner names the public address. Not removed, because removing content to hide a finding is out of scope. |
| skills-count-tight | Home | 375 | In the skill-group tiles "architecture 8" sits with no gap between label and count (screenshot `home-375.png`). Judgment: no measurement fails. | P3 | Open |
| docs-index-dup | Docs index | 375 | The chapter list appears twice, as the sidebar index above the heading and as the main list; on a phone the page opens with a list before the heading. Judgment. | P3 | Open |
| long-pages | skill page, chapter, third-party | 375 | Pages are 15 to 19 screens tall at 375 px; the page content is the kit text, so it is left as is. Judgment. | P3 | Open |

No P1 found. All other measurements passed for all 12 page types at all 3 viewports: axe violations 0, contrast failures 0, console errors 0, horizontal overflow false, images 0 on every page (so no missing alt), Home install command and "What it writes" table visible in the first screen at 375 x 812 and 1440 x 900 (screenshots), every Tab stop on Home (17) and Docs (33) at 1440 shows a 3 px ring.

## Re-run after the fixes

`measure-page.cjs` on the same 36 page and viewport pairs: every run now reports axe 0, contrast 0, smallTargets 0, overflow false, consoleErrors 0; the only non-zero field is `brokenLinks: 1` (repo-link-404, P3).

| Priority | Open | Fixed |
|---|---|---|
| P1 | 0 | 0 |
| P2 | 0 | 2 |
| P3 | 4 | 0 |

## Coverage

Pages: all 12 page types. Viewports: 375, 768, 1440. States checked: keyboard focus on Home and Docs at 1440, contrast and target size by script. Not checked: hover and active states beyond the existing `contrast.spec.ts`; the long pages were read from downscaled full-page screenshots, so text-level typography on them was not inspected; `ui-style-direction` scripts are not installed, so the template-tells scan was not run.

## KRK06-22: hero replay on Home

Re-run of the `ui-review` skill on Home after adding the replay scene. `measure-page.cjs http://127.0.0.1:4173/ <w>` at 375, 768 and 1440: axe 0, contrast failures 0, smallTargets 0, overflow false, console errors 0; brokenLinks 1 is the known repo-link-404 (P3, open). Screenshots of the final frame at the three widths (reduced motion) and a keyboard pass to the Replay button (3 px ring visible, not clipped).

| ID | Page | Viewport | Issue | Priority | Status |
|---|---|---|---|---|---|
| replay-hover-contrast | Home | 375, 1440 | `contrast.spec.ts` measured the Replay button at 3.14:1 on hover and 2.67:1 on focus: the first hover style also changed the text colour, so the colour transition was sampled mid-way. | P2 | Fixed: hover only changes the background (ink text on `--color-bg`); `test:a11y` passes. |
| replay-below-fold-375 | Home | 375 | The scene starts at y=766 of an 812 px screen, below the install command and copy button, which stay on the first screen. Judgment. | P3 | Open, by design: command first, scene follows. |

Coverage: Home only (no other page template changed); viewports 375, 768, 1440; states: final frame, mid-animation at 2 s (1440 and 375), reduced motion, JavaScript disabled, Replay hover and focus. Not checked: Safari and Firefox (Chromium only).

## KRK06-23: flow diagram on Home and /docs/the-flow/

`ui-review` on the built site (`node scripts/serve.mjs dist 4173`). `node .claude/skills/ui-review/scripts/measure-page.cjs http://127.0.0.1:4173<path> <w>` for `/` and `/docs/the-flow/` at 375, 768 and 1440: axe 0, contrastFails 0, smallTargets 0, overflow false, consoleErrors 0 on all six runs; brokenLinks 1 is the known repo-link-404 (P3, open). Screenshots of the diagram at 375 (vertical stack), 900 and 1440 (four columns) with reduced motion.

| ID | Page | Viewport | Issue | Priority | Status |
|---|---|---|---|---|---|
| flow-wide-gaps | Home, Docs the flow | 1440 | judgment: the gate row is aligned across columns, so under Plan and Parallelize there is white space between the description and the gate chip. No measurement fails. | P3 | Open |

No P1 or P2 found. `tests/e2e/flow.spec.ts` measures the drawn text in a real browser: rendered size at least 14 px (font size times the SVG screen scale) at 375, 768 and 1440, no text outside the drawing, no two text boxes overlapping, unique ids, and no animation under reduced motion. No new colour pair: the diagram uses only pairs already in the table above (ink, ink-muted, signal and accent on `--color-bg`).

Not checked: Safari and Firefox (Chromium only); the scroll-driven connector draw-in needs `animation-timeline`, which only Chromium has, and elsewhere the finished drawing is shown.

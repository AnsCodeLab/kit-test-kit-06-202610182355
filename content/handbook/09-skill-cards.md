# 9. Skill cards

> **In this chapter**
> One card for each of the 15 UI skills in the UI benchmark, plus `ticket-flow`.
> Each card says when to use the skill, what to type, what you get, and what was measured.
> Sources: each skill's `SKILL.md`, [the UI benchmark results](../superpowers/results/2026-10-13-ui-skills-benchmark-results.md), raw data in `~/eak-testlab/results-ui/` and `~/eak-testlab/results-ui-r2/`.

## How to read a card

- **Layer 2** asks: does the skill load when it should (fire) and stay quiet on a near-miss request (no-fire)? 2 trials, 6 fire prompts and 4 no-fire prompts per skill, all 15 UI skills installed together. Bar: fire at least 0.80, no-fire at most 0.10.
- **Layer 3** asks: does the agent do what the skill says? Mechanical checks, 10 runs without the skill and 10 with it. "Lift" is the difference in percentage points. "All-pass" is the number of with-runs where every check passed. Bar: lift at least 20 and all-pass in at least 7 of 10.
- One agent (Claude Code), one model (claude-sonnet-5-5), one brief. The numbers describe this setup, not UI skills in general.
- Every with-run loaded its skill because the scenarios name the task closely. In real builds with a brief that names no skill, most of these skills did not fire (see chapter 6 and the results file, layer 4).

## ui-style-direction

- **Use it when:** you are about to build or redesign a marketing, landing or product UI and want a deliberate look, not the category default.
- **Not for:** building the tokens themselves (`design-token`, `color-system`, `typography-scale`) or checking a finished screen (`visual-critique-screen`).
- **Prompt that triggers it:** "Redesign the landing page in index.html. Pick a visual direction first."
- **You get:** three directions that differ in layout, one signature device, `mood.md`, `voice.md` and `tokens.md`, a palette chosen with evidence, and a distinctness gate (template-tell scan, cold reviewer test with a control, swap test) that blocks "done".
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 31% without, 74% with, +42 lift, all-pass 0/10 in the first run. After two checks were fixed and the skill gained a `## Directions` section, the re-run gave 10/10.
- **Limits:** the re-run checks were edited after the first results, and the skill now tells the agent to write the exact structure the checks grep for, so 10/10 shows format compliance, not better designs. The owner's blind ranking judged none of the builds good.

## ui-review

- **Use it when:** you want a review or audit of a web UI before launch or after a change, with a ranked list of everything wrong and evidence for each item.
- **Not for:** a quick critique of one screen (`visual-critique-screen`) or fixing anything: it only reports.
- **Prompt that triggers it:** "Review this UI before launch: what should we improve on these pages?"
- **You get:** one list sorted P1 to P3, each item as id, page, viewport, measured evidence and fix, then a `- [ ]` checklist ready for a ticket, then a `Coverage:` line naming what was not checked.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 50% without, 78% with, +28 lift, all-pass 0/10 in the first run. After the `precision` check was fixed and the evidence rules were added, the re-run gave 10/10 (evidence-present 1 to 10, precision 6 to 10).
- **Limits:** same caveat as above: checks edited after the first runs, and the jump shows format compliance. As a build loop, the pre-review hook ran in only 2 of 8 builds.

## premium-visual-polish

- **Use it when:** the design tokens are applied and the UI still reads as a generic template, before you call it done.
- **Not for:** defining the tokens (`color-system`, `typography-scale`) or choosing a direction (`ui-style-direction`).
- **Prompt that triggers it:** "The tokens are in, but the page still looks generic. Polish it before we ship."
- **You get:** a context calibration (dense app or marketing page) and checkable replacements: typographic personality, control boundaries, visible depth, page spacing larger than component spacing, a deliberate nav placement, colour beyond one brand hue.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 61% without, 99% with, +37 lift, all-pass 9/10 (bar met).
- **Limits:** the first 0% all-pass came from a mis-aimed check; the check was fixed and a control-boundary rule (section 2a) was added to the skill after the diagnosis, so 99% and 9/10 were scored by the fixed check.

## visual-critique-screen

- **Use it when:** you want a full critique of one rendered screen across all dimensions with a prioritised fix list.
- **Not for:** a single narrow check (use one `critique-*` skill) or a multi-page audit with measurements (`ui-review`).
- **Prompt that triggers it:** "Use the visual-critique-screen skill on index.html." (user-invoked only)
- **You get:** all seven critique dimensions run on a screenshot, findings deduplicated by root cause, P1 to P3 severity by real consequence, each item with issue, dimensions and fix, and a closing paragraph with how many raw findings merged into how many entries.
- **Measured:** layer 2 not applicable (user-invoked only). Layer 3: 15% without, 94% with, +79 lift, all-pass 6/10 (lift met, all-pass missed).
- **Limits:** it is user-invoked, so it does not load on its own; in the layer 4 builds it fired in 1 of 8 `workflow` builds and 0 builds elsewhere.

## critique-color

- **Use it when:** you are reviewing the colour of one rendered screen: contrast ratios, palette coherence, semantic meaning.
- **Not for:** building a palette (`color-system`) or a product-wide WCAG audit (`accessibility-audit`, not shipped in this kit).
- **Prompt that triggers it:** "Use the critique-color skill on index.html."
- **You get:** Observation, Problem and Fix for Contrast, Palette Coherence, Semantic Use and Accessibility, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 53% without, 91% with, +39 lift, all-pass 4/10 (lift met, all-pass missed).
- **Limits:** like all seven `critique-*` skills, it did not fire in any layer 4 build, even when the brief asked for a critique; name it in the prompt.

## critique-typography

- **Use it when:** you are reviewing the type on one rendered screen: scale usage, readability, consistency, token compliance.
- **Not for:** defining the type scale itself (`typography-scale`).
- **Prompt that triggers it:** "Use the critique-typography skill on index.html."
- **You get:** Observation, Problem and Fix for Scale, Readability, Consistency and Token Compliance, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 67% without, 82% with, +15 lift, all-pass 0/10 (MISS).
- **Limits:** the diagnosis says runs fail on output labels the prompt discourages; not fixed. Did not fire in any layer 4 build.

## critique-visual-hierarchy

- **Use it when:** attention lands in the wrong place on a rendered screen: entry point, eye flow, weight, emphasis.
- **Not for:** establishing hierarchy in new work (`visual-hierarchy`) or layout balance (`critique-composition`).
- **Prompt that triggers it:** "Use the critique-visual-hierarchy skill on index.html."
- **You get:** Observation, Problem and Fix for Entry Point, Eye Flow, Weight and Emphasis, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 58% without, 97% with, +38 lift, all-pass 8/10 (bar met).
- **Limits:** did not fire in any layer 4 build, even when the brief asked for a critique.

## critique-composition

- **Use it when:** a rendered layout feels off but the hierarchy is fine: balance, whitespace, rhythm, gestalt grouping.
- **Not for:** emphasis and eye flow (`critique-visual-hierarchy`).
- **Prompt that triggers it:** "Use the critique-composition skill on index.html."
- **You get:** Observation, Problem and Fix for Balance, Whitespace, Rhythm and Gestalt, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 67% without, 98% with, +32 lift, all-pass 9/10 (bar met).
- **Limits:** did not fire in any layer 4 build, even when the brief asked for a critique.

## critique-affordance

- **Use it when:** you review an existing rendered screen for what looks clickable, state visibility, CTA clarity and action discoverability.
- **Not for:** colour (`critique-color`), overload (`critique-information-density`), or sizing targets in new work (`fitts-law`, not shipped in this kit).
- **Prompt that triggers it:** "Use the critique-affordance skill on index.html."
- **You get:** Observation, Problem and Fix for Clickability Signals, State Visibility, CTA Clarity and Action Discoverability, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 1/8 (0.12, MISS); after the description fix, no-fire 0/8 (PASS). Layer 3: 61% without, 90% with, +29 lift, all-pass 4/10 (all-pass missed).
- **Limits:** the new description names sibling skills the kit does not ship, which may mean nothing in your repo. Did not fire in any layer 4 build.

## critique-information-density

- **Use it when:** a rendered screen feels overwhelming: cognitive load, content priority, scanning pattern, progressive disclosure.
- **Not for:** the choice-count principle itself (`hicks-law`, not shipped in this kit).
- **Prompt that triggers it:** "Use the critique-information-density skill on dashboard.html."
- **You get:** Observation, Problem and Fix for Cognitive Load, Content Priority, Scanning Pattern and Progressive Disclosure, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 67% without, 100% with, +33 lift, all-pass 10/10 (bar met).
- **Limits:** did not fire in any layer 4 build, even when the brief asked for a critique.

## critique-brand-consistency

- **Use it when:** `mood.md`, `voice.md` and `tokens.md` exist and you check a rendered screen against them.
- **Not for:** defining the visual language (`ui-style-direction` writes the three files; the description also points to `illustration-style`, not shipped in this kit).
- **Prompt that triggers it:** "Use the critique-brand-consistency skill on index.html against mood.md, voice.md and tokens.md."
- **You get:** Observation, Divergence and Fix for Mood, Voice and Token Compliance, each rated `pass`, `minor issue` or `major issue`.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 67% without, 85% with, +18 lift, all-pass 1/10 (MISS).
- **Limits:** the diagnosis says runs fail on output labels the prompt discourages; not fixed. Did not fire in any layer 4 build.

## design-token

- **Use it when:** you first establish a token layer: naming and tiers (global, alias, component) for colour, spacing, type and elevation.
- **Not for:** a tonal colour scale (`color-system`), auditing existing tokens or multi-brand theming (`design-token-audit`, `theming-system`, not shipped in this kit).
- **Prompt that triggers it:** "Set up design tokens for this site: name them and split them into global, alias and component tiers."
- **You get:** a defined, organised and documented token set: categories, tiers, and a naming convention.
- **Measured:** layer 2 fire 12/12, no-fire 4/8 (0.50, MISS); after the description fix, no-fire 2/8 (0.25, still MISS). Layer 3: 60% without, 64% with, +4 lift, all-pass 0/10 (MISS).
- **Limits:** it still loads on a quarter of near-miss prompts. The diagnosis says the check mis-reads a composite shadow token; not fixed. It fired in 6 of 8 builds when the brief asked to define tokens first.

## color-system

- **Use it when:** you build a product colour system from scratch: tonal scales, semantic roles, contrast compliance.
- **Not for:** critiquing colour on a rendered screen (`critique-color`), dark mode, chart colours or theming (`dark-mode-design`, `data-visualization`, `theming-system`, not shipped in this kit).
- **Prompt that triggers it:** "Build a colour system for this product from scratch: tonal scales, semantic roles and AA contrast."
- **You get:** a brand palette, a neutral palette, semantic colours and an extended palette, with accessibility requirements.
- **Measured:** layer 2 fire 12/12, no-fire 2/8 (0.25, MISS); after the description fix, no-fire 0/8 (PASS). Layer 3: 15% without, 37% with, +22 lift, all-pass 0/10 (MISS).
- **Limits:** the diagnosis says the check is partly unsatisfiable; not fixed. It fired in 6 of 8 builds when the brief asked to define tokens first.

## typography-scale

- **Use it when:** you establish typographic structure: a modular type scale with size, weight and line-height relationships.
- **Not for:** judging type on an existing screen (`critique-typography`) or line length only (`readable-measure`, not shipped in this kit).
- **Prompt that triggers it:** "Create a modular type scale for this site with sizes, weights and line heights."
- **You get:** size, weight, line-height and letter-spacing scales, font pairing and responsive rules.
- **Measured:** layer 2 fire 11/11 (one of 12 runs left no result), no-fire 0/8 (PASS). Layer 3: 44% without, 64% with, +20 lift, all-pass 0/10 (MISS).
- **Limits:** the diagnosis says agents keep a 13 px body; not fixed. It fired in 6 of 8 builds when the brief asked to define tokens first.

## acceptance-test

- **Use it when:** a ticket has acceptance criteria to check in a running web app and nobody has a script for them.
- **Not for:** look and feel (`visual-critique-screen` and a person) or unit tests (`test-driven-development`).
- **Prompt that triggers it:** "Check the acceptance criteria of this ticket against http://localhost:3000."
- **You get:** one Playwright test per criterion, written without reading the diff and run against the real app, and one table: criterion id, PASS, FAIL, not browser-testable or unstable, and the evidence.
- **Measured:** layer 2 fire 12/12, no-fire 0/8 (PASS). Layer 3: 56% without, 90% with, +34 lift, all-pass 7/10 (bar met).
- **Limits:** measured in the UI benchmark only; it is newer than the 53-skill scenario set in chapter 6.

## ticket-flow

Measured separately, in the main benchmark (chapter 6), not in the UI benchmark.

- **Use it when:** you ask to process, implement, pick up, work on or close a ticket in Jira, Mantis, GitHub Issues or a local ticket file.
- **Not for:** checking acceptance criteria in a running app on its own (`acceptance-test`, which ticket-flow calls at Gate Q).
- **Prompt that triggers it:** "Go implement PROJ-9010."
- **You get:** work on the ticket branch, a gated flow including a QA handoff (Gate Q), a progress log on the ticket, and a closing comment with a token count.
- **Measured:** layer 3 for Claude Code in `~/eak-testlab/REPORT.md`, "Per skill": 33% without, 62% with, +29 lift, all-pass 0% to 4%; skill loaded in 28 of 28 with-runs. No layer 2 data for the merged skill.
- **Limits:** only 3 without-runs against 28 with-runs, so the baseline is thin. The judge column is empty for this row.

## The other skills

The 42 skills outside the UI benchmark, `ticket-flow` included, are listed in [chapter 4](04-catalog-guide.md) with one line each. They are not measured in the UI benchmark, and only `ticket-flow` has a card here. Chapter 6 covers the earlier benchmark of the skills that existed then.

**End of the handbook.** Back to the [handbook index](README.md).

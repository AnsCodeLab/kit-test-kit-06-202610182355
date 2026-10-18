---
name: visual-critique-screen
description: Use when reviewing an existing, already-rendered screen for UX quality end to end — "audit this screen", "review this UI", "why does this feel off" — and a full multi-dimension critique with a prioritized fix list is wanted, not a single narrow check.
disable-model-invocation: true
---

# Visual Critique Screen

Run all seven visual critiques on a rendered screen and produce a prioritized, deduplicated fix list. Adapted from the upstream `/critique-screen` command in `Owl-Listener/designer-skills` (see NOTICE.md) — this version adds a real dedupe pass and a severity/blast-radius model, both added after real testing found the upstream P1/P2/P3 step was a flat keyword match with no deduplication (see rationale below).

## Steps

1. **Render and observe.** Open the actual screen in a real browser (or the target artifact) — never critique from source code alone or from a description. Take a screenshot.
2. **Run all seven dimensions**, each via its own skill:
   - **Visual hierarchy** — entry point, eye flow, weight, emphasis, via `critique-visual-hierarchy`
   - **Brand consistency** — mood/voice/token compliance (skip any sub-dimension whose reference file doesn't exist — never invent brand rules), via `critique-brand-consistency`
   - **Composition** — balance, whitespace, rhythm, gestalt, via `critique-composition`
   - **Typography** — scale, readability, consistency, token compliance, via `critique-typography`
   - **Colour** — contrast (measure real ratios, don't estimate), palette coherence, semantic use, accessibility, via `critique-color`
   - **Affordance** — clickability, state visibility, CTA clarity, action discoverability, via `critique-affordance`
   - **Information density** — cognitive load, content priority, scanning pattern, progressive disclosure, via `critique-information-density`
3. **Collect every flagged issue** from all seven passes into one flat list before any ranking.
4. **Dedupe by root cause, not by which dimension flagged it.** The same underlying defect is frequently flagged independently by 2-3 dimensions (e.g. an oversized promotional banner shows up under Hierarchy's "Entry Point", Composition's "Balance", and Density's "Content Priority" all at once). Before ranking:
   - Group findings that describe the same visible element/defect, even when worded differently by different dimensions.
   - Merge each group into one entry, keeping the union of every dimension tag that flagged it and the sharpest/most specific evidence from any of them.
   - A finding that only one dimension raised stays as its own entry.
5. **Assign severity from a real blast-radius model, not a category-keyword match.** For each deduplicated finding, ask in order:
   - Does it risk irreversible data loss, an unconfirmed destructive action, or a security/privacy exposure? → **P1**, regardless of which dimension(s) flagged it.
   - Does it break a WCAG AA requirement or make a primary task's control unusable/unreadable (e.g. a live control styled as disabled, contrast below the required ratio on a functional element)? → **P1**.
   - Does it degrade the experience or create real inconsistency on a primary/secondary element, without blocking the task? → **P2**.
   - Is it visual refinement on a tertiary/decorative element with no functional or accessibility impact? → **P3**.
   A promotional button's own low-contrast text is not automatically the same severity as an unconfirmed delete action just because both dimensions used the word "accessibility" or "breaks" — rank by actual consequence to the user, not by which rubric sentence technically matches.
6. **Output** the deduplicated, severity-ranked list. Each item includes:
   - **Issue**: what is wrong (the merged description, if deduped)
   - **Dimensions**: every critique area that flagged it (plural where merged)
   - **Fix**: the specific change required
   Conclude with a one-paragraph overall assessment naming the strongest and weakest dimension, and how many raw findings were merged into how many deduplicated entries (so the ranking's real signal-to-noise is visible, not hidden).

## Why steps 4 and 5 exist

Real testing on a fixture with known, deliberately-planted defects showed the upstream command's instruction — "collect every flagged issue... and rank them" against three one-line category definitions — has two structural gaps: (1) no dedupe step, so a single root defect gets independently re-flagged 2-3 times under different dimensions, inflating the apparent finding count and diluting the list's readability; (2) no real severity/blast-radius model, so a promotional button's contrast failure and an unconfirmed destructive-delete action can both satisfy the letter of "breaks accessibility" and land in P1 together, even though one risks data loss and the other is cosmetic. The fix in this version is mechanical and checkable — merge by root cause, then rank by actual consequence — rather than leaving both judgment calls entirely to whichever agent happens to execute the command carefully.

---
name: ui-style-direction
description: Use before building or redesigning a marketing, landing or product UI - chooses a deliberate visual direction (not the product-type default), writes mood.md, voice.md and tokens.md, and ends with a distinctness gate that fails pages that still read as a generic template.
---

# UI Style Direction

## Overview

**Core principle:** token systems and critiques polish a design; they do not choose one. Left alone, a model picks the most common look for the product category (for a developer tool: a dark hero, a terminal card, one glowing accent) and every later check only tidies it. This skill makes the choice explicit, makes it different from the category default, and tests the result.

```
THE PRODUCT-TYPE DEFAULT IS THE THING TO DEVIATE FROM, AND A COLOUR IS NEVER A DIRECTION
```

Use it first. Then use `design-token`, `color-system`, `typography-scale` and the rest to build, and `visual-critique-screen`, `critique-brand-consistency` and `premium-visual-polish` to check. `critique-brand-consistency` needs the three files this skill writes.

## Procedure

### 1. Collect what only this product has
Read the brief and the product. List 5 to 10 concrete, checkable facts that a competitor could not claim: real commands, file names, counts taken from the data, the actual workflow, the real logo and brand colours. Never invent a number or a quote. A colour named in a requirements document is an input to question, not a decision: ask why it is there, and if nobody can say, treat it as open.

### 2. Write down the product-type default, then forbid it
In two lines, describe the look this category usually gets (use `references/styles.md`, "Category defaults"). This is the baseline you must leave. The final design must differ from it in at least **two named ways** (for example: base colour, display typeface, layout skeleton, hero object, motion).

### 2b. Challenge the page structure, not only the surface
Most "generic" verdicts come from the section sequence: hero, trust strip, feature tabs or cards, numbered steps, install band, pricing or offer, footer. Write down the sequence the brief or PRD gives you and the category's usual one. The final page must break the template in **at least one named structural way**: drop a standard section, reorder sections, merge two sections into one, replace the hero object, or move the primary action out of the hero. Justify it with the product facts from step 1. A new skin on the same sequence is not a new design. Content claims, routes and tests stay as they are; only order, grouping and presentation change.

### 3. Propose three directions that differ in layout, not only in colour
Prior designs count: if the repo, the ticket or the user shows an earlier design or an earlier direction for this product, every new direction must differ from it in layout skeleton too. Each direction states: the layout skeleton (where the headline sits, section order, what the hero object is), the style from `references/styles.md` it draws on, the type pairing, the colour logic (accent plus a second hue with a job), and one reference taken from **outside** the category that **you name yourself** (this skill deliberately gives no examples, so that two runs do not converge on the same one). Take its grid and rhythm, not its surface. A reference that many sites already borrow (cream paper and serif display, dark mode with a glow, pastel gradients) does not count as outside.
- Reject the direction closest to the category default and write one sentence why.
- Choose one of the other two, with a reason tied to the audience and the facts from step 1. Ask the user when two are close; otherwise choose and say why.
- Write all three down in `mood.md` under a `## Directions` heading, as three labelled entries (`Direction A`, `B`, `C`), each with a `Layout skeleton:` line (headline position, section order, hero object). A chosen direction plus a one-clause "rejected" note is not three directions.

### 4. Define one signature device
Exactly one visual device built from this product's own material (its real workflow as the hero graphic, its real file tree as the page spine, its real commands as the headline). Not an icon grid, not a stock illustration, not a generic product mock-up. One device done well beats several.

### 5. Write the three brand files
Create these in the repo's `docs/` (or where the project keeps design docs). Short, specific, checkable.
- `mood.md`: 5 keywords, the `## Directions` section from step 3 with the choice marked, the chosen style and why, the category default you leave and the two named deviations, the signature device, do and don't lists.
- `voice.md`: tone in one line, forbidden filler and hype words, how call-to-action labels are written (name the outcome; one label per intent), real-content rule.
- `tokens.md`: the canonical colour (accent, second hue with its job, truly neutral greys unless the style says otherwise), type pair with weights and tracking, spacing and radius scale, shadow layers, motion durations. Measure contrast; do not invent values when a published system's values fit.

### 5b. Choose the palette with evidence
`references/palettes.json` holds 50 checked palettes: five feels (calm, editorial, bold, warm, technical) with ten each, grouped by feel and not by product type. Every record carries measured contrast ratios, colour-blindness checks, and flags.
1. Source order: the brand's real colours first, then colours drawn from the signature device, and only then the library.
2. Pick **three** candidate palettes whose feel matches the chosen direction. Put them on the real hero in screenshots before choosing.
3. Prefer records with no `flags`. A flagged record (`generic developer-tool hue`, `blue plus orange CTA pair`, `green family`) needs a written reason in `tokens.md`. Treat any colour named in a requirements document as an input to question.
4. A palette the user brings (from Color Hunt, Coolors or a brand guide) is checked with `node scripts/check-palette.mjs <bg> <text> <accent> [second] [border]` and used if it passes. Do not scrape palette websites.
5. A record's `fails` must be empty for text pairs; if you change a colour, run the check script again and copy the numbers into `tokens.md`.
6. The second hue carries state and emphasis, never the primary action; never rely on colour alone for state.

### 6. Build against the files
Apply the tokens through `design-token` and friends. Check each page against the three files with `critique-brand-consistency`.

### 7. Distinctness gate (blocks "done")
All of these must pass. Record the evidence.

1. **Template-tell scan** on the rendered DOM, per page. Run `node scripts/snapshot-page.cjs <url> > snapshot.json` and then import `scanTells` from `scripts/scan-lib.mjs`; report the counts. Count and report each; more than one of these is a failure:
   - a radial or blurred gradient glow behind the hero or a closing band;
   - a row of pill chips used as facts or logos;
   - three or more equal cards with an icon, a title and two lines;
   - an icon-and-label grid used as filler;
   - a centred "Get started" or "Install" band repeating the hero CTA;
   - the same CTA label more than once for one intent;
   - a stats, metrics or "by the numbers" section with no real source, or `LABEL // YEAR` section labels;
   - a decorative accent border on every card;
   - one hue doing every interactive job.
2. **Cold reviewer test, with a control.** Take full-page screenshots with the logo and product name hidden. Give each version to a fresh reviewer with no context, in its own session and in a blind order, and ask: what kind of product is this, which common template does the page follow, and name three real websites it resembles? Always include the previous design as a control: it must be judged as the template, otherwise the reviewer is not discriminating. Fail if the new design is judged to follow the same template as the control, or names the same family of sites. Attach the answers. If the reviewer names a different template family but still a common one (for example editorial cream and serif), that is a pass on this test only if the section sequence also breaks the template (check 6).
3. **Swap test.** State one deliberate choice each for colour, type, layout, copy and motion; each must be visible in the screenshots.
4. **Signature device** is present on the first screen and is built from real content.
5. **Two named deviations** from the category default are visible.
6. **Structure.** The section sequence differs from the category template in at least one named way (step 2b), and the reviewer's description of the page structure no longer matches the template list in step 2b. Use the same `snapshot.json` and import `checkStructure` from `scripts/scan-lib.mjs`; it names the breaks.

If a check fails, change the design, not the check. A model reviewer finds obvious sameness, not taste: for a launch or a brand site, also show two or three candidates to a person.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "The brief says to use the brand green/blue, so the direction is done" | A colour is not a direction. Layout, type, hero object and copy decide whether it is recognisable. |
| "The database recommends this style for this product type" | That is the category default. It is the baseline to deviate from, not the answer. |
| "Dark hero with a terminal is what developer tools look like" | That is why it is the look nobody remembers. Name two deviations. |
| "Three variants are just three colour schemes" | Variants must differ in layout skeleton or they are one design. |
| "I'll add polish later and it will feel unique" | Polish refines a direction; it cannot create one. |
| "The cold reviewer named a common template, but it's close enough" | That is a fail. Change the design. |

## Red flags: stop

- Starting to build with no `mood.md`, `voice.md`, `tokens.md`.
- A direction described only by colours and adjectives.
- Three candidates with the same layout.
- A signature device made of stock icons or invented numbers.
- A stats or metrics section the product cannot back with real data ("By the numbers", "Key statistics", uptime or response-time cards), or any invented figure.
- Section labels in the `LABEL // YEAR` style ("SYSTEM // 2024"); write a plain heading.
- Declaring the gate passed without the screenshots and the reviewer's answer.

## Attribution
Three content rules (no invented stats, no fake metric sections, no `LABEL // YEAR` labels) are adapted from the `taste-design` skill in the Apache-2.0 `google-labs-code/stitch-skills`; see `NOTICE-stitch-skills.md`. Style entries in `references/styles.md` are adapted from the MIT-licensed `nextlevelbuilder/ui-ux-pro-max-skill` data; see `NOTICE-ui-ux-pro-max.md`. Palette colour values come from the MIT-licensed Tailwind CSS v3.4.17 default colours, see `NOTICE-tailwindcss.md`.

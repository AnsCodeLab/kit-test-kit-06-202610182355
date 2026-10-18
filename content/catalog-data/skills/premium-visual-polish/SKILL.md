---
name: premium-visual-polish
description: Use after applying design tokens (color-system/typography-scale/spacing-system/motion-system) and before calling a UI done — checks for the specific defects that make a token-correct screen still read as a generic template, and replaces them with concrete, checkable treatments calibrated to the surface (dense utility app vs. marketing/landing page).
---

# Premium Visual Polish

## Overview

**Core principle:** a screen can pass every design-token check (real color roles, a real type
scale, a spacing system, named motion durations) and still look like a generic template. Tokens
are inputs to a design; they are not the design. This skill catches the gap between "technically
uses the system" and "reads as considered" — a gap a token audit alone cannot see, because the
defects are about how boldly and consistently the tokens get applied, not whether they exist.

**The gap this closes, with real evidence:** a rebuild used a real OKLCH color system, a real
1.25-ratio type scale, real named motion tokens, and real elevation tokens — and still drew direct
user feedback that the UI was "very ugly" on first look. The root causes were not missing tokens;
they were:
- A perfectly reasonable font (Inter) used with zero typographic personality — one weight jump
  (400→700) and no tracking/sizing drama between hero text and body text.
- Undersized shadows (2-6% alpha) that were technically "elevation" but invisible at a glance —
  cards read as flat rectangles with a faint outline, not as raised surfaces.
- Page-level spacing barely larger than component-level spacing (24-40px vs 16px) — no rhythm
  difference between "this is a page section" and "this is a button's padding."
- A default edge-to-edge nav bar with no spatial distinction from the page canvas.
- Exactly one accent hue used everywhere — no color richness, no secondary/tertiary hue for status
  or accent variety beyond the one brand blue.
- Hover states that only changed a background color — no motion, no scale, no felt response.

## The Iron Law

```
TOKENS EXISTING IS NOT THE SAME AS THE SCREEN LOOKING CONSIDERED — CHECK THE APPLICATION, NOT JUST THE PALETTE
```


## Prefer an Adopted System's Real Values Over Invented Ones

A second real round on the same rebuild made this concrete: a first redesign pass correctly used
a token *pattern* (color roles, a type scale, named motion durations) but *invented* the actual
values by feel. A follow-up evidence-based critique measured real WCAG contrast ratios against
those invented values and found two P1 failures: a hand-picked accent blue at 4.23-4.34:1 against
the 4.5:1 text minimum, and a hand-picked border gray at 1.32:1 against the 3:1 non-text minimum —
both looked reasonable by eye and both silently failed real accessibility math. Switching the same
token *slots* to a real, published, accessibility-tested design system's actual values (e.g. IBM
Carbon, Material Design, Fluent) — not inventing new numbers, just adopting theirs — passed both
checks on the first measurement with no further tuning, because those values were already
engineered and tested for exactly this by the system's own maintainers.

**Practical rule:** when a project's own taste-driven token values haven't been measured against
real contrast/touch-target requirements, prefer adopting the literal published values (colors,
type scale steps, spacing scale, elevation model) of an established, well-documented system over
inventing your own — reserve custom values for genuine brand requirements a real system's palette
can't satisfy, and measure those specifically before shipping.

## Context Calibration (do this first)

Classify the surface before applying anything below — the same intensity is wrong in both
directions if misapplied:

- **Dense utility/admin surface** (data tables, CRUD forms, dashboards used repeatedly by the same
  people to get a task done fast): apply the polish below at **restrained** intensity — real depth
  and rhythm, but never at the cost of information density or scan speed. An edge-to-edge nav is
  fine here if it has real weight (blur/shadow/border), not because it's the default.
- **Marketing/landing/portfolio surface** (first impression matters more than repeat-use speed):
  apply at **full** intensity — generous whitespace, a distinctive nav treatment, scroll-triggered
  reveals are all in scope.

State which classification you're using and why before making changes. Applying landing-page
maximalism to a dense CRUD screen (or a spartan utility treatment to a marketing hero) is itself a
defect this skill is meant to prevent.

## Checkable Replacements

### 1. Typographic personality, not just a type scale
A ratio-based type scale (typography-scale skill) defines *sizes*; it does not define
*personality*. Add at least one of:
- A distinct weight for display/hero text (800-900) clearly heavier than heading weight (600-700),
  itself clearly heavier than body (400-500) — three visibly distinct steps, not two.
- Tighter tracking on large display text (-0.02em to -0.04em) and slightly looser tracking on small
  uppercase labels/eyebrows (+0.1em to +0.2em) — never uniform tracking across every size.
- On a marketing surface: consider a second typeface for display text specifically (a distinctive
  serif or display grotesk), body text stays a workhorse sans.

### 2a. Control boundaries are not decoration
A light grey border that looks refined on a card can be the only thing that shows where an input or an outline button ends. Those edges are user interface components and need 3:1 against the background (WCAG 1.4.11). Give controls their own stronger border token (for example `--color-border-strong`) and keep the pale token for cards and dividers. Check the ratio; do not judge it by eye.

### 2. Depth that reads at a glance
A shadow token under ~8% alpha on its darkest layer is invisible on most displays at normal
viewing distance — it will look flat in a screenshot and flat in person. Use at least two layers:
a tight, higher-alpha layer for contact shadow (e.g. 8-12% alpha, 1-2px blur) plus a soft, wider
layer for ambient depth (e.g. 8-15% alpha, 15-30px blur, larger offset). Pair with a light border
only if the surface needs crispness at small sizes — border alone with no shadow is flat regardless
of border color.

### 3. Rhythm: page spacing must visibly exceed component spacing
If a button's internal padding and a page's section padding are within 2x of each other, there is
no rhythm — everything reads at the same visual "volume." Utility surfaces: page/section padding
should be at least 3-4x a button's padding. Marketing surfaces: 6-10x, with real air between
sections.

### 4. Navigation is a placement decision, not a default
An edge-to-edge flat bar is a valid choice for a dense utility surface, but it must be a *chosen*
one with real weight (a shadow-on-scroll, a background blur, or a bottom border with actual
contrast) — not the unstyled default that happens to be what a framework scaffolds. On a marketing
surface, consider spatial separation from the canvas entirely (inset/floating, rounded, its own
elevation) as the default hypothesis, not an afterthought.

### 5. Color richness beyond the one brand hue
One accent color used for every interactive element, every status, and every accent is a fast path
to "generic." Add at minimum a second hue for a genuinely distinct semantic role (not just a darker
shade of the same hue) — team/category color-coding, a secondary accent for a less-primary action
class, or richer status colors than the bare minimum success/danger/warning triad.

### 6. Motion that responds, not just transitions
A hover state that only swaps a background color is a transition, not an interaction. Every
primary interactive element (buttons, cards that navigate, nav items) should have a felt response:
scale on press (~0.97-0.98), a subtle lift or translate on hover, or an icon/indicator that moves —
using the motion-system skill's own duration/easing tokens, not ad hoc values.

### 7. Copy and proof that read as real
Polish fails when the words are template words, however good the type and depth are.
- Call-to-action labels name the outcome ("Start the audit", "Download the report"), not "Get
  Started", "Learn More" or "Submit". One label per intent on the whole page.
- Cut filler and hype words (seamless, elevate, unleash, supercharge, next-gen, cutting-edge,
  game-changer) and use the concrete verb.
- Every metric, testimonial, logo and avatar is real, or visibly marked as a placeholder. No
  invented numbers, no suspiciously round stats (99.9%, 10x) without a source, no Lorem ipsum,
  `[placeholder]` or TODO left in shipped copy.

### 8. Small tells and the swap test
- An accent-coloured side border on every card, and status dots that do not map to a documented
  state, are decoration. Use them only to encode a real state.
- Swap test: replace the logo and brand name with a competitor's. If the page still reads as the
  same page, it has no identity. State one deliberate choice each for colour, type, layout, copy
  and motion, and check that each one shows.

## Pre-Ship Checklist

Run this after `visual-critique-screen`, not instead of it — this checklist catches the specific
"technically-tokened but still generic" gap; the critique skill catches broader hierarchy/
composition/accessibility issues.

- [ ] Surface classified (utility vs. marketing) and intensity chosen accordingly, stated explicitly
- [ ] At least 3 visibly distinct type weights are in use (display/heading/body), not 2
- [ ] Every elevated surface has a two-layer shadow with a visible near-layer (≥8% alpha), not a
      single faint shadow under a plain border
- [ ] Page/section padding is at least 3x a button's internal padding
- [ ] The nav's treatment was a deliberate choice, not the framework's unstyled default
- [ ] At least two distinct hues are doing real semantic work, not one hue at different shades
- [ ] Every primary interactive element has a felt (scale/translate/lift) response, not just a
      color swap
- [ ] Squint test: with the screen blurred, hierarchy and depth are still visible — a token-correct
      but flat screen usually fails this even when every individual token is "correct"
- [ ] CTA labels name the outcome, with no generic "Get Started / Learn More / Submit" and no
      duplicate labels for the same intent
- [ ] No hype or filler words; no Lorem, `[placeholder]` or TODO; every metric, testimonial, logo
      and avatar is real or marked as a placeholder
- [ ] Accent borders and status dots encode a real state, not decoration
- [ ] Every border that marks the edge of an input, a select, a ghost or outline button, or any control must be found by sight is at least 3:1 against the background it sits on. Measure it (`ui-style-direction/scripts/check-palette.mjs` or any WCAG ratio) and do not rely on the light decorative border token; a card or divider hairline may stay lighter, a form field edge may not
- [ ] Swap test passed: with the brand swapped for a competitor's, the page is still distinguishable,
      and one deliberate choice each for colour, type, layout, copy and motion is stated

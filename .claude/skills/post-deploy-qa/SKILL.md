---
name: post-deploy-qa
description: Use when a feature or deploy has just shipped to a staging or production URL and needs verification — for requests to test the deployed app, QA the staging site, check whether a deploy broke anything, smoke test production, or confirm a release is safe before announcing it.
---

# Post-Deploy QA

## Overview

**Core principle:** the only evidence that a deployment works is a real browser driving the actual deployed URL through the changed flow, end to end. Reading the diff, reading the served source, or re-executing the page's logic in an isolated sandbox tells you whether the *code* is internally consistent — not whether the *deployment* a real user will hit actually behaves.

**Violating the letter of this rule is violating the spirit of it.**

This is a **Maintain**-stage check: the code has already landed and is running somewhere reachable.

- **REQUIRED BACKGROUND:** `test-driven-development` proves behavior against source, before merge. This skill proves behavior against the running deployment, after merge — different artifact, different failure class.
- `requesting-code-review` / `cross-model-review` evaluate the diff. This skill never treats the diff as the verdict; it only reads the diff to decide which live flow to click through.

## When to Use

- "Test the deployed app" / "QA the staging site" / "smoke test production" / "check if this deploy broke anything"
- Right after a merge or deploy, before telling anyone the release is safe
- The change has a real user- or API-reachable surface to click through (not a pure background job or migration with nothing to drive live)

**Not for:** verifying code before it merges, or evaluating a diff's logic in isolation — use `test-driven-development` / `requesting-code-review` for those.

## The Iron Law

```
NO SHIP / NO-SHIP VERDICT WITHOUT A REAL BROWSER DRIVING THE ACTUAL DEPLOYED URL
```

Browser tool errored or timed out? Fix the browser access. Never quietly substitute curling the HTML, reading the source, or re-executing the page's extracted script in a stub sandbox — and then still deliver a confident verdict. Those test your reimplementation, not the deployment.

## Workflow

**1. Name the flow, not the page.** From the diff/PR/ticket, write down the exact multi-step user journey the change touches (e.g. "add item → apply coupon → change quantity"), plus any adjacent flow the diff claims is unaffected — regressions cluster at the seam between new code and the "unrelated" feature next to it, so click through the seam too.

**2. Open a real browser on the real URL.**
```javascript
let tab;
try {
  tab = await browser.open({ name: "qa", url: STAGING_URL });
} catch (e) {
  // "omp browser relay ... extension never connected" means the default
  // relay path has no browser attached — launch a direct instance instead
  // of falling back to non-browser verification. Check `which google-chrome`
  // / `which chromium` for a real local binary path if unsure.
  tab = await browser.open({ name: "qa", url: STAGING_URL, app: { path: "/usr/bin/google-chrome" } });
}
```
If neither path works, stop and report the blocker. Don't fall back to non-browser checks and still hand back a ship/no-ship verdict.

**3. Click through the flow exactly as a user would.** Drive it with `tab.click` / `tab.fill` / `tab.select`, and read real rendered state after each step (`tab.text`, `tab.value`, `tab.isVisible`) — not the source that's supposed to produce it. Screenshot (`tab.screenshot`) the instant anything looks wrong.

**4. Fix or report:**

| Outcome | Action |
|---|---|
| Clear, in-scope root cause | Write the regression test first (`test-driven-development`), make the atomic fix, commit fix + test together, then re-run the same live click-through to confirm the symptom is gone on the deployment. |
| Not confidently fixable now | Stop. Report: URL, exact repro steps, expected vs. actual, screenshot, root cause if visible in source. Don't guess at a fix you haven't verified live. |
| Flow behaves correctly | Say so with the exact steps you drove and what you observed — never "looks fine." |

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Browser tool unavailable, so I extracted the script and ran it in a JS sandbox" | You tested your own reimplementation, not the deployment. A stub DOM has no real network layer, asset pipeline, or render/CSS/timing behavior — exactly what post-deploy QA exists to catch. |
| "It failed twice, so as a fallback I ran the page's code against a stub DOM" | A caveat admitting the gap doesn't make the substitute equivalent. Get real browser access working, or stop and report the blocker — don't silently downgrade the evidence bar and still hand back a ship/no-ship verdict. |
| "The PR author says this part is unaffected" | Diff authors are frequently wrong about blast radius. Click through the "unaffected" adjacent flow anyway. |
| "It loaded, looks fine" | Page load isn't the flow. Walk the actual multi-step journey the change touches. |
| "Quick smoke test, no time" | Quick means fewer flows covered — not fake coverage of the one flow that matters. |

## Red Flags — STOP and Get Real Browser Access

- About to give a ship/no-ship verdict with no `tab.click`/`tab.fill` trail against the real URL
- Substituted curl, static reads, or re-executing extracted script for live interaction
- Only confirmed the page loads, never drove the actual changed flow
- Trusted the diff's claim that an adjacent flow is "unaffected" without clicking it
- About to report a confident verdict while a caveat admits the verification method wasn't real browser interaction

**All of these mean: stop, get a real browser on the real URL, and re-verify before answering.**

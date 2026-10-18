---
name: acceptance-test
description: Use when a ticket has acceptance criteria that must be checked in a running web app and nobody has a script for them - turns each criterion into a Playwright test written without reading the diff, runs it against a preview or local URL, and reports pass or fail per criterion as QA evidence.
---

# Acceptance Test

## Overview

**Core principle:** a test the implementer wrote for their own code proves the code does what the implementer thought. An acceptance test proves the ticket's requirement is met, from outside. It is written from the criteria and the running app, never from the diff.

```
ONE TEST PER CRITERION, WRITTEN BLIND TO THE DIFF, RUN AGAINST THE REAL APP
```

This is the scripted half of the QA step in `ticket-flow` (Gate Q). It does not replace a person's judgment on look and feel: use `visual-critique-screen` and a human for that. It also does not replace unit tests from `test-driven-development`.

## When to use

- The ticket has acceptance criteria and the app can be opened at a URL (local dev server, PR preview, staging).
- A QA handoff would otherwise be prose that someone repeats by hand each time.
- The `overnight-test-loop` needs a fixed suite to run in rounds.

## Procedure

1. **Extract the criteria.** List each acceptance criterion from the ticket, one line each, with an id (`AC1`, `AC2`, ...). If a criterion cannot be observed in a browser (a file's contents, a code-style rule, "feels fast"), mark it **not browser-testable**, say why, and hand it to a person or another check. Never invent an observable that was not in the ticket, and never turn a vague criterion into a loose assertion to make it pass.
2. **Stay blind to the diff.** Do not read the implementation's diff or the developer's tests before writing. Read the ticket, the running app, and the repo's conventions (`AGENTS.md`, `CLAUDE.md`, existing `tests/e2e/`). If you wrote the implementation in this session, run this step in a fresh subagent that gets only the criteria, the URL and the conventions.
3. **Explore, then plan.** Open the app with the Playwright MCP or CLI (or `webapp-testing` if installed). For each criterion write the steps and the exact observable: URL, role or label or text, count, attribute, computed style. Save the plan as `tests/e2e/PLAN.md` (criterion, steps, expected).
4. **Generate tests.** One Playwright test per criterion, named with the id, for example `test('AC3 nav shows the current page with more than colour', ...)`. Prefer user-facing locators (`getByRole`, `getByLabel`, `getByText`) over CSS paths. Run at the viewports the ticket names (typically 1440, 768 and 375 px). Put the base URL in an environment variable. See `references/playwright-skeleton.md`.
5. **Run against the real app.** Use the PR preview or a local build served the way production serves it, not a mock. Save a screenshot per criterion.
6. **Read failures honestly.**
   - The app is wrong: that is a defect. Report `FAIL` with the criterion id and evidence. Do not fix the app inside this skill.
   - The test is wrong (bad locator, timing): fix the test, rerun, and say you did. **Never weaken an assertion to get green**: no loosening a count, no deleting a check, no `.skip`, no retry that hides flakiness. If two honest reruns still flake, report the criterion as `unstable`, not `PASS`.
7. **Report.** One table: criterion id, PASS or FAIL or not browser-testable or unstable, and the evidence (test name, screenshot path, what was observed). The first line of a comment posted to the ticket is the result for the QA job or QA person to read; only the QA owner posts `QA: PASS` or `QA: FAIL`, so write `Acceptance tests: N of M criteria pass` and let the QA step decide.
8. **Keep the suite.** Commit `tests/e2e/` (with the repo's commit rules) so the same criteria can be re-run on every change. Mention how to run it (`npx playwright test`).

## Common rationalizations

| Excuse | Reality |
|---|---|
| "I wrote the feature, so I know what to assert" | Then the test checks your reading of the ticket. Use a fresh subagent that has only the criteria. |
| "The assertion is too strict, I'll relax it" | A relaxed assertion is a missed defect. Fix the test only when the locator or timing is wrong. |
| "One flaky retry and it passes, fine" | Report `unstable`. A pass that needed luck is not a pass. |
| "This criterion is vague, I'll assert something nearby" | Mark it not browser-testable and ask. Do not invent an observable. |
| "All tests are green, so QA is done" | QA owner sign-off is a separate step. These tests are evidence for it. |
| "It passes locally, so the preview is fine" | Run against the preview or a production-like build. |

## Red flags: stop

- Reading the diff or the developer's tests before the plan exists.
- A test with no criterion id, or one criterion covered by a vacuous check.
- `.skip`, a deleted assertion, or a widened tolerance to reach green.
- Posting `QA: PASS` yourself.
- Running only at one viewport when the ticket names several.

## Related skills

- `ticket-flow`: Gate Q; this skill produces the evidence it asks for.
- `post-deploy-qa`: a one-off walk of a deployed URL; this skill leaves a rerunnable suite.
- `overnight-test-loop`: runs a suite in rounds and verifies each failure before calling it a bug; point it at this suite.
- `visual-critique-screen`: judgment on look and feel, which a script cannot give.

## Attribution

Pattern follows Playwright's own plan, generate and heal workflow (Apache-2.0, https://playwright.dev/docs/test-agents) and the `webapp-testing` skill in `anthropics/skills`. No text is copied; install those separately if you want them.

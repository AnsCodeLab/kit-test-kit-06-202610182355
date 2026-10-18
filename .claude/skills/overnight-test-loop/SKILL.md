---
name: overnight-test-loop
description: Use when asked to run the tests or a suite in rounds, in a loop, overnight, or unattended, and to fix or ticket whatever fails while nobody is watching.
---

# Overnight Test Loop

## Overview

Unattended, every red test is a claim nobody checks. **A failure is a bug only after it survives the verification gate; the ledger is the loop's memory.** Violating the letter of these rules is violating the spirit.

**REQUIRED SUB-SKILLS:** test-driven-development (regression tests), systematic-debugging (root cause), verification-before-completion (every "green" claim), agent-commit-audit-log (if you commit).

## Before round 1

Put in the ledger header and your first message: **N rounds** (the user's number wins; default 10), a **wall-clock or budget stop**, the full-suite command, named flows. Create `.overnight/ledger.md`:

```
| Round | Command | Commit (+dirty) | Passed/Failed | Findings (label, test, evidence) |
```

Every row carries the real short SHA of HEAD (`+dirty` if uncommitted changes exist) and counts read from that round's own output. Never "same", "ditto", or a row backfilled after the fact.

## One round

1. Run the FULL suite and named flows. Append the row before touching anything else.
2. Run every failure through the gate below.
3. Fix only what the gate labels PRODUCT-BUG or TEST-BUG. The regression test must be written and watched failing before the fix.
4. Re-run the whole suite. That run is the next round's row. **Rounds are never run back-to-back before fixing**, and a fix is never the last thing you do: if you fix in the final round, add one closing verification row.

## Verification gate (every failure, before it is called a bug)

| Step | Done when |
|---|---|
| Reproduce | The single test failed in isolation, 3+ times. Record k/n. |
| Flakiness | Mixed pass/fail on the same code = FLAKY. Also try the test alone vs. in the suite (order, shared state, time, env). |
| Test vs spec | Read the test against the spec (README, ticket, `git log` of both sides). Whichever side contradicts the spec is wrong. |
| Root cause | Located and explained; minimal repro is one call or command with expected vs. actual. |
| Duplicate | Searched existing tickets and the ledger. |
| Label | PRODUCT-BUG, TEST-BUG, FLAKY, ENV, or UNVERIFIED (could not conclude). |

## What each label gets

- **PRODUCT-BUG:** a ticket in the project's tracker (REQUIRED SUB-SKILL: ticket-flow conventions, including its local ticket file reference when there is no tracker access). It holds repro, k/n, spec line, ledger round. Status stays open: only a human closes it.
- **TEST-BUG:** fix the test to match the spec. Never bend source, spec, or README to a stale test. Ledger only, no ticket.
- **FLAKY / ENV / UNVERIFIED:** ledger only, no ticket, never mentioned inside another ticket. Fix a flaky test only by removing its nondeterminism. Never `skip`, `expectedFailure`, or retry to get green.

## Stop conditions (exactly these)

N rounds done; two consecutive clean rounds (a round with any failure, even a flaky one, is not clean); the same failure survives 2 fix attempts (stop, report, do not thrash); budget or time limit; anything needing credentials, production, or a destructive step. Never delete tests, files, or history, `reset --hard`, force-push, or touch anything outside the repo.

## Final report

Ledger summary; verified bugs with evidence; flaky/unverified list with k/n; what you did not run; **what to look at first**. Report only the last suite result you actually saw.

## Rationalizations

| Excuse | Reality |
|---|---|
| "Three runs before fixing is the loop" | That is three observations. Fix, then run the next round. |
| "I read the code, it's obviously flaky/stale" | Reading is a hypothesis. Reproduce it in isolation and record k/n. |
| "The user said just make it green" | Green by bending source or skipping is not green. |
| "I'll write the test with the fix" | Untested-red tests prove nothing. Watch it fail first. |
| "Already fixed, so close the ticket" | A human closes it. |
| "Demo only, skip the ledger" | One row per round is the audit trail. |

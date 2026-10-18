---
name: cross-model-review
description: Use before committing, merging, or declaring ready-to-ship any non-trivial ad hoc feature, fix, or refactor that isn't already governed by ticket-flow's Gate B — a one-line typo/config fix doesn't need this, anything touching business logic, an ambiguous spec, or more than one file does.
triggers:
  - ready to ship
  - merge this
  - tests pass, ship it
  - already spent too long on this
  - we already agreed on the approach
---

# Cross-Model Review

## Overview

**Core principle:** the model that wrote the code cannot be the model that proves it's right. Self-written tests validate self-consistency, not correctness against intent — if you interpreted an ambiguous spec one way and wrote tests matching that interpretation, the tests will pass even when the interpretation is wrong. This is not a hypothetical: same-family models share correlated blind spots and confidently agree in the same places.

**Violating the letter of this rule is violating the spirit of it.**

## The Iron Law

```
NO "READY TO SHIP" WITHOUT A REVIEW FROM A GENUINELY DIFFERENT MODEL OR VENDOR
```

If ticket-flow's Gate B already governs this work (a tracked ticket, Real-change tier), that gate's review requirement satisfies this rule — do not duplicate it. This skill covers everything Gate B doesn't: ad hoc feature work, refactors, and fixes requested directly by a human that were never a ticket.

## When to Use

**Always**, for non-trivial ad hoc work:
- New behavior or business logic (pricing, permissions, billing, anything with a "correct" answer someone downstream relies on)
- Any spec with room for two reasonable interpretations
- Changes touching more than one file in a load-bearing way

**Skip only for genuinely trivial changes** (one-line config value, obvious typo, copy fix) — matching ticket-flow's own Trivial-tier bar. When unsure which bucket it's in, treat it as non-trivial.

## How to Review

1. Dispatch a reviewer with a **different model or vendor** than the one that wrote the code — use the `codex` skill for a genuine second vendor when it's available.
2. If no second vendor is available, dispatch an isolated same-vendor reviewer subagent in a **fresh context** (per `requesting-code-review`) — this doesn't fully solve the correlated-blind-spot problem, but a fresh context with no memory of the implementation's reasoning still catches more than the same session re-reading its own work.
3. The reviewer gets the diff and the stated requirement/spec — never the implementer's reasoning trail, never a summary written by the implementer. It forms its own opinion before it ever sees anyone else's, exactly like ticket-flow's Gate B.
4. Reconcile feedback: where it agrees, fix first. Where it conflicts with your read of the spec, check the actual requirement again — don't pick a side by vote.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests pass, ship it" | Tests you wrote yourself only prove your code does what you meant it to do — not that what you meant matches what was asked. |
| "I've already spent too long on this" | Sunk cost isn't a correctness argument. A wrong shipped feature costs more than a review pass. |
| "We already agreed on the approach yesterday" | Agreeing on an approach isn't the same as verifying this specific implementation matches it. Agreement in a meeting didn't read this diff. |
| "This is urgent, no time for review" | A second reviewer pass is minutes. A wrong pricing/permissions bug shipped under a deadline is not faster to fix later. |
| "I'll just re-read my own diff" | You already believe it's right — that's why you wrote it that way. Rereading confirms your own reasoning, it doesn't test it. |
| "The spec was clear enough" | If it were unambiguous, two people reading it would write the same tests. A fresh reviewer is how you find out whether that's true. |

## Red Flags — STOP and Get a Second Model

- About to say "ready to ship" / "merged" / "done" without a reviewer having seen the diff
- Justifying skipping review with a deadline, prior verbal agreement, or how much time was already spent
- The only verification is tests you wrote in the same pass as the implementation
- A spec detail required picking one of two reasonable interpretations and no one else confirmed which

**All of these mean: dispatch a reviewer — different model/vendor first, fresh-context same-vendor otherwise — before claiming this is done.**

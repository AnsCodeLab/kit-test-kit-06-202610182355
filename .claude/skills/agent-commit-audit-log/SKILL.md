---
name: agent-commit-audit-log
description: Use whenever committing any change you authored as an agent, in any repo, for any reason — routine, urgent, or explicitly told "just commit it, no need to check in."
triggers:
  - just commit it
  - no need to check in
  - routine change
  - low-risk, go ahead and commit
---

# Agent Commit Audit Log

## Overview

**Core principle:** a commit authored by an agent that only says *what* changed, with no record of *which agent/model* made the change or *why*, is not auditable after the fact. Git's own author field is usually a generic human/service identity, not the actual model or session that produced the diff — the only place that information can survive is the commit itself.

**Violating the letter of this rule is violating the spirit of it.**

## The Iron Law

```
NO AGENT-AUTHORED COMMIT WITHOUT AGENT-IDENTIFYING TRAILERS
```

If ticket-flow's Gate B/reporting step already covers this (a tracked ticket, Real-change tier — it logs a note to the ticket plus a token-cost breakdown), that satisfies this rule for that commit; don't duplicate. This skill covers every other agent-authored commit — ad hoc work, no ticket, "just commit it" requests included.

## What to Add

Append git trailers to the commit message (a `Key: value` block after a blank line at the end of the message body — `git commit` supports this natively, no extra tooling required):

```
Add getVersion endpoint handler

Agent-Model: <model/harness identity, e.g. claude-sonnet-5, gpt-5-codex>
Agent-Task: <one-line description of the request that prompted this, or the ticket/issue id if one exists>
```

- **Agent-Model**: the actual model or harness name, not a generic "AI" or "assistant". If you don't know your own exact identifier, use the most specific name you do know (harness name, session type) rather than omitting the trailer.
- **Agent-Task**: enough context that someone reading `git log` six months later knows what was asked, without having to find the original conversation. A ticket/issue id alone is fine if one exists.

Trailers are queryable later with plain git: `git log --grep="Agent-Model: gpt-5-codex"` finds every commit a specific model made.

## When to Use

**Always**, for any commit you author as an agent — this includes commits explicitly framed as routine, low-risk, or not needing check-in. Those framings are about whether a *human* needs to review before merge, not about whether the commit needs to be auditable after the fact.

**Skip only** when a fuller mechanism already covers it for this commit (ticket-flow's Gate B reporting) — don't add a second, redundant trail.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's a small/routine change" | Audit trails matter most in aggregate — one untracked commit breaks "which model touched this file" for the whole file's history. |
| "The commit message is descriptive enough" | Descriptive of *what* changed, not *which agent* changed it or *what request* prompted it — that's a different fact, not implied by the diff. |
| "No one asked me to log this" | The absence of a request is exactly the failure mode — nobody asks for the log until they need it and it isn't there. |
| "I'll add it if this becomes a habit/pattern" | Skipping it once is how it never becomes a habit. Add it now, every time. |
| "I don't know my exact model identifier" | Use the most specific name you do know. An approximate identity beats no identity. |

## Red Flags — STOP and Add the Trailer

- About to run `git commit` on your own authored change with no `Agent-Model:`/`Agent-Task:` trailer
- Justifying the skip with "routine," "low-risk," or "no need to check in" — those describe review urgency, not audit necessity
- The commit message alone would leave a future reader unable to tell an agent made this change, or which one

**All of these mean: append the two trailers before committing, every time.**

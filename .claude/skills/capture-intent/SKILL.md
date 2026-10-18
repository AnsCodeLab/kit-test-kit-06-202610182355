---
name: capture-intent
description: Use when a stakeholder hands you a raw, non-technical ask - a customer complaint, a support-ticket pattern, a business pain point, or a feature request in their own words - before any technical framing, architecture, or approach has been discussed. Not for requests that already name a specific technical change (an endpoint, a bug in a named file, a library bump); those go straight to brainstorming.
---

# Capture Intent

## Overview

Turn a raw, non-technical ask into a version-controlled intent record —
problem, desired outcome, affected users/systems, constraints, open
questions — before any technical framing starts. This is the step
*before* brainstorming: brainstorming assumes the request already has
technical shape (a feature, a component, a bug to fix); capture-intent
is what produces that shape out of a stakeholder's own words.

## When to use

- A customer-support ticket dump, a raw feature request, or a
  stakeholder describing a pain point in their own words, with no
  technical framing yet.
- **Not** when the request already names a specific technical change
  (an endpoint, a bug in a named file, a library upgrade, a schema
  field, a UI component) — that's already scoped. Go straight to
  brainstorming instead.

Predicate: does the ask name any implementation noun (endpoint, table,
service, file, library, framework, component)? Yes → brainstorming
directly. No → capture-intent first.

## Hard gate

<HARD-GATE>
Do NOT propose a technical solution, architecture, technology, or
implementation option — not even as a menu of choices "for context" —
until the intent record below is written and the stakeholder has
confirmed it's accurate. Do NOT offer to start building anything.
Violating the letter of this gate (a tentative options menu, a
"default recommendation" floated before confirmation) is violating its
spirit — solutioning is solutioning regardless of how softly it's
phrased.
</HARD-GATE>

## Process

1. **Ask about the problem in the stakeholder's own terms**, one
   question at a time: what's actually happening, how do you know it's
   a problem (cost, frequency, evidence), who is affected, what would
   "fixed" look like, what constraints exist (deadline, budget, what
   must not change). Do not ask about platform, stack, or where data
   lives yet — that's a brainstorming question, not this one.
2. **Restate the problem back** in plain language and get explicit
   confirmation before writing anything down.
3. **Write the intent record** (template below) to
   `docs/superpowers/intent/YYYY-MM-DD-<topic>-intent.md`. Fill every
   field; move anything genuinely unknown to Open Questions rather
   than leaving it blank or guessing. Commit the record to git.
4. **Get the stakeholder to confirm** the written record matches what
   they meant. Revise and reconfirm if it doesn't.
5. **Hand off.** Invoke the brainstorming skill to begin technical
   design. Do NOT invoke any other skill and do NOT design the
   solution yourself — brainstorming is the next step, not this one.

## Intent record template

```markdown
# Intent: <topic>

## Problem (stakeholder's own words)
> <lightly cleaned quote>

## Problem (restated)
<one paragraph, plain language, no technical terms>

## Desired outcome / success criteria
<what "fixed" looks like, ideally measurable>

## Affected users / systems
<who feels this, which existing systems/teams touch it — business
names, not code names>

## Constraints
- <deadline, budget, compliance, what must not change, what's
  explicitly out of scope>

## Open questions
- [ ] <anything still unresolved>
```

No field is optional — move the unknown to Open Questions rather than
skip it. No technical approach, architecture, or technology choice
belongs in this document; that begins in brainstorming, after this
record is confirmed.

## Red flags

| Thought | Reality |
|---|---|
| "Here are a few ways we could build this, pick one" | Solution options are brainstorming's job. Get the problem confirmed first. |
| "What platform/stack are you on?" as an opening question | Implementation question, too early. Ask what's happening and who's affected first. |
| "My default recommendation is X — let me know and I'll start building" | Never offer to build here. Capture, confirm, hand off. |
| "They're in a hurry, I'll just propose the obvious fix to save a round trip" | Time pressure doesn't shrink the gate. A wrong guess costs more time than the questions would have. |
| Leaving a template field blank because "not sure yet" | Move it to Open Questions. Never leave a field unfilled. |
| "The problem is obviously a missing feature, I'll just say what to build" | Naming a feature IS technical framing. Restate the problem, not the fix. |

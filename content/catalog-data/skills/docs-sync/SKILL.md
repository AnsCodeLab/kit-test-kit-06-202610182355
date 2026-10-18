---
name: docs-sync
description: Use when a code change is about to be considered finished (including immediately after finishing-a-development-branch) or when told the docs are stale, to update the docs, or to sync docs with the changes, and the project has existing docs (README.md, ARCHITECTURE.md, CHANGELOG.md, AGENTS.md/CLAUDE.md, docs/) that might now describe outdated flags, APIs, config, or behavior.
---

# Docs Sync

## Overview

**Core principle:** a shipped diff isn't done until every existing doc that described the old behavior describes the new one. Docs drift silently because the coding task is scoped to code — nothing forces a re-read of the README once tests are green. This skill is the scan-and-reconcile pass: map the diff's changed surface against the project's existing doc inventory and fix only the passages that now contradict the code.

**This is reconciliation, not authorship.** It never creates the project's first README or ADR (that's a doc-authoring decision for the user), and it is not the merge/PR/keep gate (that's `finishing-a-development-branch`) — it can run chained after that gate, or stand alone on an explicit ask.

## When NOT to use

- No existing doc describes the changed surface — nothing to reconcile, say so and stop.
- Pure internal refactor with zero observable-behavior change (same flags, same signatures, same output) — nothing drifted.
- The project has no docs at all yet — creating the first one is an authoring decision, not this skill.

## Procedure

1. **Extract the changed surface.** From the diff (or the commit(s) being synced), list every observable-interface element it touched: flag/argument names, function or endpoint signatures, config keys, defaults, error messages, exit codes.
2. **Enumerate the full doc inventory before fixing anything.** `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `AGENTS.md`/`CLAUDE.md`, and everything under `docs/`. Check every one that exists — stopping after the first hit leaves the rest wrong.
3. **Grep each doc for both the old and new form of each changed-surface term.** A passage describing the *old* state is drift; a passage already matching the new state or never mentioning the surface at all is not touched.
4. **Fix drift in place.** Edit the passage so it matches current behavior, in its existing section, at its existing level of detail. Don't restructure or rewrite prose the diff didn't touch.
5. **CHANGELOG.md is historical, not living state.** A past entry describes what that release actually shipped at the time — never rewrite it to match a later change. Add a new entry only if the project already keeps an "Unreleased" section or per-change convention, and only for a genuinely user-facing change.
6. **Report what you checked, not just what you changed:** every doc file touched (with a one-line reason), and every doc file in the inventory you reviewed but left alone (with why).

## Bounded scope — stop and ask before you cross this line

Fix existing passages only. Never invent a new doc file, new top-level section, or new doc convention (a `MIGRATION.md` nobody asked for, a "Flags" section bolted onto a README that never had one) to house the update — even under time pressure to "just get the docs synced." If the shipped change has no existing slot to correct, that's the signal to stop and ask, not to create one:

```
The diff adds <X>, but no existing doc has a slot describing it
(closest is <file>, which only covers <Y>). Add a new section to
<file>, or leave it undocumented for now?
```

Anything you notice while scanning that the diff didn't touch (an unrelated stale line, a typo) goes in the report as a flagged observation, not a fix.

## Common mistakes

| Mistake | Fix |
|---|---|
| Fixed the one doc file you were pointed at, didn't check the rest | Enumerate the full inventory (step 2) before fixing anything |
| Rewrote a CHANGELOG entry for a past release to match new behavior | Past entries are historical — add a new entry instead, per convention |
| Created a new file/section to hold the update because nothing existing fit | Bounded scope — ask first (see above) |
| Treated "code merged, tests green" as done without checking the doc inventory | The doc-inventory scan is part of done for any diff with a documented surface, not an optional extra |

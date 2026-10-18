---
name: plan-to-tickets
description: Use when an approved implementation plan (from writing-plans, saved under docs/superpowers/plans/) needs to be filed as tracker tickets (Jira or Mantis) for a team to pick up, instead of being executed directly in this session — requests like "turn this plan into tickets," "get this plan into Jira/Mantis for the team," "file this as tickets," or "hand this off to the team" rather than "implement this plan" or "let's build it now."
---

# Plan to Tickets

## Overview

**Core principle:** the plan.md already contains the real ticket breakdown — each `### Task N` block is a self-contained slice with its own Files/Interfaces, and the Consumes/Produces fields between tasks already are the real dependency graph. This skill's job is translating that structure into the tracker's ticket and link primitives, not inventing a new decomposition — and getting the human to sign off on the resulting ticket *shape* before any ticket exists, because redesigning a list on screen is free and redesigning filed tickets (some of which a teammate may already be pulling from) is not.

Distinct from:
- **writing-plans** produces the plan.md itself and never touches a tracker — this skill starts where that one ends.
- **executing-plans** / **subagent-driven-development** execute the plan.md directly, in this session or an isolated worktree, no tracker involved. Use this skill instead of those when the actual implementation should be distributed across a team via a tracker.
- **ticket-flow** executes one already-filed ticket end to end. This skill is what puts the tickets there in the first place, then hands off to ticket-flow for each one. It never implements a ticket itself.

## When to use

- An approved plan.md exists (from writing-plans) and the ask is to file/convert/turn it into tracker tickets, or to have "the team" / "someone else" / "another agent" pick the work up — not to build it here.
- **Not for:** a plan the user wants executed now in this session (→ executing-plans / subagent-driven-development); a ticket that's already filed (→ ticket-flow); a raw ask with no plan yet (→ capture-intent / brainstorming / writing-plans first).

## Process

### 1. Load the plan

Read the plan.md in full. It needs the writing-plans header (Goal/Architecture/Spec) and at least one `### Task N` block with a **Files** and an **Interfaces** (Consumes/Produces) section — the rest of this process derives from those. Missing Interfaces sections means the dependency graph can't be derived reliably; stop and ask the user to run writing-plans' self-review to add them rather than guessing an order from prose.

### 2. One ticket per demoable slice — not per checkbox, not per plan

A `### Task N` block is the granularity floor — writing-plans already sized it as "the smallest unit that carries its own test cycle." Never file a ticket per checkbox step (too granular to be worth a team member's context-switch) and never fold the whole plan into one ticket (defeats the entire point of distributing it).

Default: one ticket per Task block. Merge adjacent tasks into a single ticket only when a task has no deliverable of its own to demo (pure scaffolding/config) — fold it into the ticket whose slice actually needs it.

Test each candidate ticket against this question: **handed only this ticket's title, Files, Interfaces, and steps, could one engineer build and demo something real without reading a sibling ticket?** If the honest answer is "they'd also need ticket N+1's content to know what they're building," the boundary is wrong — merge it or move the missing piece over. This is the check that catches an "arbitrary chunk" — a horizontal slice (e.g. "all the backend work") rather than a vertical one a stakeholder could see running.

### 3. Build the block graph from Consumes/Produces, not from reading order

For every ticket pair, ticket A is blocked by ticket B exactly when A's Consumes names something only B's Produces defines. Two tickets with no Consumes/Produces overlap are not blocked on each other, even if the plan happened to list them in that order — narrative task order in a plan is not evidence of a dependency; the Interfaces sections are.

### 4. Confirm the breakdown before filing anything

<HARD-GATE>
Do not call any ticket-creation tool until the proposed breakdown — every ticket's title, one-line scope, and which other proposed tickets it's blocked by — has been shown to the user and explicitly approved (or edited and re-approved). This holds even when the plan looks unambiguous, even when there's no open ambiguity left to ask about, and even when nothing would be "really" filed in a draft/dry-run pass — the review point is the ticket *shape*, not whether the write call happened to execute. **Violating the letter of this gate is violating its spirit:** a breakdown mentioned in passing, buried in a longer report, or "shown" in the same turn the tickets already got filed does not count as the review point this gate exists to create.
</HARD-GATE>

| Excuse | Reality |
|---|---|
| "The plan already enumerates the tasks clearly, so 1 task = 1 ticket is a direct translation, not a judgment call" | The translation is still a judgment call: whether to merge, which slice a shared piece belongs to, what the epic-level framing is. A plan author optimized for an implementer reading top to bottom, not for a team splitting the work — those are different audiences with different correct shapes. |
| "I was told to act on my own judgment / not ask clarifying questions" | Showing the breakdown for approval isn't a clarifying question about ambiguity — it's the one sign-off this skill exists to get, for the same reason Gate A exists in ticket-flow: catching a bad split here costs rewriting a list, not rewriting tickets a teammate already opened. |
| "Nothing was really filed — this was a draft with no mutating calls" | The gate is about the breakdown decision, not the API side effect. Reporting the draft after deciding the shape is still deciding before asking; show it before the shape is final. |
| "The team's waiting, filing now and adjusting later is faster" | Adjusting later means re-parenting or re-linking tickets someone may already be pulling from, and re-explaining scope to whoever picked up a ticket that got merged away. Showing the list first is minutes; that cleanup is not. |

**Red flags — stop and show the breakdown first:**
- About to call `createJiraIssue` / `mantis_issues_create` with no prior turn where the user saw and approved the ticket list
- Treating "the plan is clear" or "I was told to use my own judgment" as license to skip showing the breakdown
- Time pressure ("the team's waiting," a meeting starting) framed as a reason to file now and reconcile after
- Reporting what was filed in the same breath as what's proposed, so there was never a point where the user could have said no

### 5. Detect the tracker, or ask

1. Check the plan.md and the repo's `AGENTS.md`/`CLAUDE.md` for an explicit tracker statement (a Jira project key, a named Mantis project, prior ticket references). Use it if named.
2. Otherwise probe which tracker's MCP tools actually resolve a project for this repo — `getVisibleJiraProjects` / `mantis_projects_me` are both read-only. If only one tracker is reachable, or only one returns a project that plausibly matches this repo, use that one.
3. If both are reachable and neither is unambiguous (multiple candidate projects, or the repo genuinely uses both), ask the user which tracker and project/key to file into — don't guess between two live trackers.

### 6. File tickets, then declare blocks — blockers first

File in dependency order so blocker IDs exist before the links that reference them.

**Jira:** `createJiraIssue` per ticket (title → `summary`, the ticket's Files/Interfaces/steps → `description`). Call `getIssueLinkTypes` once and use whichever type is actually named `Blocks` (or the closest real equivalent — don't hardcode a name that may not exist on this instance). For every block edge A-blocked-by-B: `createIssueLink(inwardIssue=B, outwardIssue=A, type=<that type>)` — the tool's own contract is inwardIssue = the issue that blocks, outwardIssue = the issue that's blocked.

**Mantis:** `mantis_issues_create` per ticket. The mounted Mantis MCP surface only exposes a parent/child structural link (`mantis_issue_add_parent_relationship`), not a directional blocks type — real Mantis relationship types beyond parent/child aren't reachable through this tool set, so don't claim a "Blocks" link exists here. Use parent/child as the closest available structural proxy (`issue_id=<blocked>, parent_issue_id=<blocker>`), and back it with an explicit `mantis_issue_note_add` note on the blocked ticket ("Blocked by #<blocker id> — do not start until it resolves"), since parent/child alone reads as hierarchy in the Mantis UI, not sequencing, and whoever picks the ticket up needs the plain-text statement to know not to start it yet.

### 7. Hand off — don't implement

Report the filed tickets and their block relationships back to the user. Do not implement any of them in this session. Each filed ticket now goes through **ticket-flow** (which picks the tracker's reference file itself), individually, once picked up — **REQUIRED SUB-SKILL:** ticket-flow, per ticket. Tickets with no unresolved block can be picked up or dispatched in parallel; a blocked ticket waits for its blocker(s) to close, exactly as the plan's own Consumes/Produces order intended.

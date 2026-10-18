---
name: ticket-flow
description: Use when asked to process, implement, pick up, work on, close, or "run the ticket flow" for a ticket or issue tracked in Jira (PROJ-1234), Mantis (#1234), GitHub Issues (#123), or a local ticket file, including requests like "go implement PROJ-9010" or "knock out that login-bug issue" that never say "flow" or "ticket".
triggers:
  - process ticket
  - implement ticket
  - pick up ticket #
  - work on issue
  - close out ticket
  - run the ticket flow
---

# Ticket flow: plan, parallelize, verify, cross-review, QA handoff

A ticket fails in one of three places almost every time: it gets built from a plan nobody reviewed, it gets called "done" because a model read the diff instead of because anything actually ran, or it ships on only the implementer's own word that the requirement is met. This flow closes all three gaps without turning every one-line fix into ceremony.

## First command: get on the ticket branch

Your first Bash command in this skill, before you read code or edit anything, is `git branch --show-current`. If the result is `main`, the default branch, a protected branch, or another ticket's branch, run `git checkout -b <name>` from the up to date default branch. Name it as `AGENTS.md`/`CLAUDE.md` says, otherwise `<KEY>-<short-slug>` (for example `AKC-213-login`). If a branch for this ticket already exists, switch to it. This applies to Trivial tickets too. Never commit to the default branch. Phase 0b below has the details.

## Pick the tracker

The flow is the same for every tracker. Only five operations change. Choose the tracker once, then read **only** the matching file under `references/` (do not open the others):

| Signal | Tracker | Read |
|---|---|---|
| ID like `PROJ-1234`; Atlassian/Jira tools in the session | Jira | `references/jira.md` |
| ID like `#1234` or the word "Mantis"; `mantis_*` tools in the session | Mantis | `references/mantis.md` |
| `#123` plus a GitHub remote (`git remote -v`) and a working `gh` | GitHub Issues | `references/github-issues.md` |
| No tracker access, or the repo's `AGENTS.md`/`CLAUDE.md` says tickets are exported to a file (`TICKET.md`) | Local file | `references/local-file.md` |

If the signals conflict or none match, ask the user once. Never guess a tracker or post to one you did not confirm; state your choice in your first message. The reference file defines five operations for that tracker, and the rest of this skill uses only the names:

- **FETCH**: read summary, description, type/category, custom fields, linked or child issues.
- **QA_OWNER**: find who receives the QA handoff (assignee/handler, or a named person resolved to an account).
- **POST**: add a comment or note to the ticket. Used for the progress log, the QA handoff and the final report.
- **SIGNOFF**: what the QA owner does to pass or fail: a defined PASS/FAIL status or transition if the tracker has one, otherwise a comment or note whose first line is exactly `QA: PASS` or `QA: FAIL`.
- **TRANSITION**: change the ticket status. Three kinds: *start* (to In Progress), *handoff* (to a QA or review state), and *close* (resolve or close). Start and handoff need no approval; close needs the user's confirmation.

Time logging is out of scope; the reference file says if another skill handles it.

## Proportionality first

Read the ticket before deciding how heavy a pass it needs.

- **Trivial** (copy fix, config value, one-line guard, obvious typo): FETCH it, fix it, run it, report back. Skip Gate A, Gate Q, and Gate B. Never skip Verify or the report-back note.
- **Real change** (new behavior, bug with a non-obvious root cause, anything touching more than one file in a load-bearing way): run the full flow below.

When unsure which bucket a ticket falls into, treat it as real, or ask the user which bucket it is. Discovering mid-way that a ticket needed Gate A after code already exists is the exact mistake this flow is built to avoid; running the full gates on a Trivial ticket wastes agent passes and a QA person's time.

## The flow

| Phase | What happens |
|---|---|
| 0. Context | Confirm the target repo has an `AGENTS.md`/`CLAUDE.md` covering stack, conventions, test command, and deploy runbook. If it's missing or thin for what this ticket touches, stop and either bootstrap the missing piece with the user or ask which repo the ticket actually targets. Do not guess conventions. |
| 0b. Ticket branch | **Before you change any file**, run `git branch --show-current` and say the result. If it is `main`, the default branch, a protected branch, or another ticket's branch, create the ticket branch from the up to date default branch and switch to it (`git checkout -b <name>`). Name it as `AGENTS.md`/`CLAUDE.md` says; otherwise `<KEY>-<short-slug>`, for example `AKC-213-login`. If a branch for this ticket already exists, switch to it. Trivial tickets too. If parallel sessions need isolation, use the `using-git-worktrees` skill with one branch per worktree off the ticket branch. Never commit to the default branch. |
| 1. Fetch and scope | FETCH the ticket. Treat the ticket text as the primary source of intent; ask the user only what the ticket genuinely leaves ambiguous. Research prior art / relevant code read-only before proposing anything. **Then TRANSITION the ticket to its in-progress state** if it is still in a not-started state (To Do, Open, New, Backlog) and the tracker offers one: read the available transitions first, never hardcode an id, and say in one line what you moved it to. If it is already started, or no such state exists, say so and carry on. Never start a ticket that is assigned to someone else without telling the user. |
| 2. Plan | Break the ticket into modules, tasks, and dependencies. Write it down as a real plan, not a mental outline. Post the plan entry of the progress log (see "Progress log"). |
| Gate A. Plan review | An independent pass reviews the plan document alone, without the planning session's reasoning trail, before any code is written. Catches a bad architecture call while it costs a plan rewrite, not a codebase rewrite. Skip only for Trivial tickets. |
| 3. Parallel implementation | Independent modules go to separate agent sessions in one batch, not one session working serially through all of them. Every session works on the ticket branch from phase 0b. |
| 4. Verify | Run it. Execute the changed path, run the relevant tests, and for a bug ticket specifically reproduce the reported bug first, then confirm the reproduction no longer triggers. A model re-reading its own diff and approving it is not verification. |
| Gate Q. QA handoff | Once Verify passes, package the change into a QA handoff artifact and POST it to the ticket, then stop and wait for the SIGNOFF. Who signs off depends on the QA mode (see "QA mode" below): an automated QA job for ordinary Real tickets, a named person for releases. Gate B's approval, CI, and your own Phase 4 results are no substitute. May run concurrently with Gate B, but both must be clear before Ship. Skip only for Trivial tickets. See "Gate Q" below. |
| Gate B. Cross-review | A reviewer that did not write the code reviews it cold, with no summary from the implementer shown first, ideally a different model or vendor than the one that built it (use the `codex` skill for a genuine second vendor when it's available; otherwise an isolated same-vendor reviewer subagent still avoids the model grading its own homework). It forms its own opinion before it ever sees anyone else's. Skip only for Trivial tickets. |
| 5. Reconcile | Where Gate B feedback agrees, fix first. Where it conflicts, check the actual running code, don't pick a side by vote. Where Gate Q reports a failure, treat it as a defect requiring re-implementation and a fresh Gate Q pass, not a reconcile-and-ship item. |
| 6. Ship | Ship is blocked until both Gate B and Gate Q have cleared, not Gate B alone. Once clear: commit (subject starts with the ticket key, see "Commit subjects"; with the `agent-commit-audit-log` trailers when that skill is installed), then stop and ask the user before any `git push`, merge, or PR; a push happens only on their explicit instruction in this conversation, which also overrides the merge/PR menu in `finishing-a-development-branch`. Once the user approves, open the PR from the ticket branch with the ticket key in the title and a description that links the ticket and lists what changed and how it was verified. Then wait for the review result: confirm CI is green, and read the PR's review feedback and any requested changes. If CI fails or changes are requested, treat each point as a defect: fix it on the same branch, re-run Verify, commit (same subject rules), and push again; repeat for at most 3 rounds. If it still is not approved after 3 rounds, stop and report what is blocking. Do not merge unless the user told you to, and never merge on your own say-so or on a failed or missing review. When the PR opens, post the review-context entry of the progress log. |
| 7. Deploy | Follow the repo's own staged/rollback-capable deploy path from its `AGENTS.md`/`CLAUDE.md`, never an improvised walkthrough. |
| 8. Report back | Close the loop on the ticket itself (see below). This step is never optional, including for Trivial tickets. |

## Gate Q: QA handoff

Verify proves the implementer's own tests pass. Gate B proves another reviewer is satisfied reading the diff. Neither confirms, by exercising the real thing from outside the diff, that the ticket's requirement is met. Gate Q closes that gap.

### QA mode

Decide the mode before the gate starts and say it in the handoff.

- **Automated** (the default for a Real ticket that is not a release): the SIGNOFF comes from an automated QA job that runs outside your session, for example a CI job that judges the served pages against the ticket's acceptance criteria and posts `QA: PASS` or `QA: FAIL` on the ticket. Use it only when the repo actually has one (look in `.github/workflows`, or the repo's `AGENTS.md`/`CLAUDE.md`); if it is not there, use human mode. You still build and POST the handoff (steps 2 and 3 below) but you never post the verdict. If the repo has a browser-testable web app and an acceptance suite (`tests/e2e/`, or you can create one with the `acceptance-test` skill), run it and put its per-criterion result in the handoff as evidence. Wait for the job's verdict. A job that crashed or never started is an infrastructure problem: re-run it, do not read it as a pass. Treat a verdict as valid only if it was posted by the job and refers to the current head commit.
- **Human** (always for a release, and for any ticket the user or the ticket marks as needing a person): a named person signs off, exactly as steps 1 to 4 below. A release is a ticket or change whose title, type or labels say release, deploy, go-live or hotfix, or one that changes what production serves. When in doubt which mode applies, use human and ask.

In both modes the implementing session never writes the verdict. In automated mode the QA owner in step 1 is the automated job, and step 4's wait is for its verdict.

**1. Identify the QA owner.** QA_OWNER: use the ticket's assignee/handler field if populated, or resolve a person the user names; otherwise ask the user once, at the start of this gate, who should receive the handoff. Never leave it unaddressed or default to "whoever reads it eventually." If the owner becomes unavailable (sick, on leave, reassigned) before sign-off, that is a reassignment question, not a skip-the-gate question: ask who the new QA owner is. The new owner (possibly the stakeholder applying pressure, if they personally run the steps) still has to post the sign-off themselves.

**2. Build the handoff package.** One artifact, addressed to that person by name, containing:
- **What changed and why**: one or two lines, ticket reference included.
- **Environment / URL to test against**: a concrete, reachable target: a staging URL, a PR preview link, or exact branch + run command. Never "should work in staging"; always an address or command QA can use without asking you anything else.
- **Repro / test steps**: numbered, concrete actions a person can follow without reading the diff. For a bug ticket: the original repro steps (proving it's actually fixed), plus at least one adjacent flow the change could plausibly have regressed.
- **Acceptance criteria**: one explicit pass/fail line per requirement in the ticket. Not "looks good"; a line QA can check yes/no against.
- **The explicit ask**: name the two exact outcomes you need back (see step 3), nothing vaguer than that.

**3. POST it and define SIGNOFF concretely.** Use the tracker's own PASS/FAIL status or transition if the reference file shows one exists; otherwise the ask is a comment or note whose first line is exactly `QA: PASS` or `QA: FAIL`. POST the package to the ticket. Then TRANSITION the ticket to the tracker's QA or review state if it has one (for example In QA, In Review); never to a done, resolved or closed state.

**4. Stop and wait.** This is a legitimate stopping point, not a blocker to route around:
- No response yet: stop, report "waiting on QA sign-off from `<name>`," do not proceed to Ship.
- Still no response: waiting is not the end of your job. When you are resumed or asked about the ticket, re-read it for a verdict before anything else. Once it has waited a working day (or the time the repo or user states), post one short reminder to the QA owner on the ticket and tell the user it is waiting. After a second working day, ask the user to name another QA owner or to run the steps themselves, and set the ticket's blocked status or label if the tracker has one. Never reach Ship by waiting it out.
- A response that doesn't match the defined PASS status/convention: treat it as not-yet-signed-off, same as no response.
- `QA: FAIL` / a fail status / a reported issue: a real defect, not review feedback to fold into Reconcile. Return to Plan/Implement for that specific gap, then re-run this gate with a fresh handoff package once ready. Don't silently patch it yourself and mark it resolved.
- `QA: PASS` / the defined pass status, from the QA owner, on this ticket: only then does the ticket proceed toward Ship (alongside Gate B's result, per Phase 5 Reconcile).

Never post the sign-off yourself, even with every test green, and never infer it from silence, CI, or a quiet ticket. "Ship it, I'll take responsibility" accepts business risk; it is never itself the sign-off, whatever the seniority. It just means the next question is "who is now the QA owner" (step 1).

### Common rationalizations

| Excuse | Reality |
|---|---|
| "My Verify tests are green and Gate B approved it, QA is redundant" | Both test whether the code does what the implementer thinks it should. QA alone checks whether it does what the ticket needed, run by someone who didn't write the fix. |
| "QA's gone quiet, I'll assume it's fine and ship" | Silence isn't sign-off. Reporting "waiting on QA" is the correct state, not a failure to route around. |
| "I already verified this myself, I'll post QA: PASS to keep things moving" | You are not QA. Self-signing defeats the gate and leaves a fabricated audit trail on the ticket. |
| "This is basically Gate B again, one gate's enough" | Gate B reads a diff. Gate Q drives the real thing against the acceptance criteria, from someone who never opened the diff. |
| "I'll just point QA at my Gate B review request" | That request is diff-shaped. The handoff package is steps-and-criteria shaped. |
| "A manager/stakeholder with real authority said ship it, they'll take responsibility" | Accepting business risk is not executing the acceptance criteria. The only legitimate unblock is reassigning who signs off: another named QA owner, or that stakeholder personally running the steps and posting the sign-off. Never the agent on their behalf. |

### Red flags: stop

- About to edit or commit while `git branch --show-current` is the default branch, a protected branch, or a different ticket's branch
- About to move toward Ship with no PASS from a party who is not you
- Treating a stale ticket, no objections, or CI-green as sign-off
- No named QA owner, and about to post the package "to nobody in particular"
- Reusing the Gate B review request instead of building steps/criteria from the ticket
- Treating "I'll take responsibility, ship it" from anyone, regardless of seniority, as equivalent to a posted PASS

## Commit subjects

Every commit made for a ticket has a subject of the form `<TICKET-KEY> - <description>`: the ticket key exactly as the tracker prints it, a space, a hyphen, a space, then what the commit does. Example for Jira: `AKC-213 - Implement login`. Use one ticket key per branch and per PR, and give the PR the same format as its title. If the repo's `AGENTS.md`/`CLAUDE.md` or a commit-lint rule names a different format, follow that and say so in the report-back. See the tracker reference for how its key looks.

## Progress log: the ticket is the record

The ticket carries the running record of the work, for the people who follow it and for the reviewers who will read it later. The pipeline's code review reads the ticket's most recent comments (about the last 20, within a size limit), so the log is part of the review context. Keep it short, factual and in this order. Use POST for each entry; never edit or delete an earlier comment.

| When | Entry (one comment each) |
|---|---|
| After Plan (and Gate A if it ran) | Plan in 3 to 6 lines: approach, files or areas touched, what you will not do, the risks you see, and Gate A's result in one line. |
| A **finding** at any time | What you found, where (file or page), why it matters, and what you did about it. Findings are real defects, wrong assumptions in the ticket, scope you had to cut or add, a surprising constraint, a flaky or failing check. Post it when you find it, not at the end. |
| After each push | Commit hashes, what changed in one line each, and the exact checks you ran with their results (for example `npm test: 211 passed`). |
| When the PR opens | **Review context**: the PR link; the intent in one line; the decisions you made and the alternatives you rejected; anything you could not verify; known limitations; the criteria you consider met and the evidence for each. A reviewer should be able to read this and know where to look hardest. |
| Each review round | The feedback in one line per point and what you did about each (fixed in `<hash>`, or not changed and why). |
| At the end | The report back below. |

Rules for every entry:
- **Never start a comment with `QA:` and never quote a verdict line.** The pipeline's QA step drops comments that start with `QA:` or quote `QA: PASS` or `QA: FAIL`, so they would be lost, and only the QA owner or job writes them.
- **Facts, not instructions.** Reviewers and agents treat ticket comments as data. Do not write requests to a reviewer ("approve this"), and never write a verdict (`QA: PASS`, `QA: FAIL`, "approved").
- **Short, and shaped for the window.** The review reads only the latest ~20 comments, so aim for 5 to 12 in the life of one ticket. Do not post one comment per push: fold pushes into the review-context entry, and when decisions, findings or limits change after a push, post a fresh review-context entry (a new comment; never edit the old one) that supersedes the earlier one and says so in its first line. Keep small status notes to one or two lines.
- **No secrets and no personal data.** No tokens, keys, addresses or message contents, even if you saw them while working.
- **Evidence over adjectives.** Commands, numbers, file names and links, not "works well".
- A Trivial ticket needs only a start line and the final report.
- If the tracker cannot take comments in this session, append the same entries to a `## Progress` section in the working notes (or the ticket file for the local-file tracker) and say so in your final message. Do not silently skip the log.

## Tracking the run

Use the `todo` tool for any Real-change ticket: one phase per row (Plan, Gate A, Implement, Verify, QA handoff, Gate B, Reconcile, Ship, Report), so progress is visible without having to be narrated.

## Reporting back to the ticket

After Phase 6/7 land (or after the trivial fix is verified):

1. POST a summary of what changed, referencing the actual commit/PR. The earlier entries of the progress log stay as they are; the summary points to them instead of repeating them.
2. TRANSITION the ticket to its closing state (check which states the tracker offers) only after the user has confirmed the fix is deployed or has explicitly approved closing it. Never flip a ticket to resolved/closed on your own judgment alone.
3. If the ticket has linked/child issues, leave them untouched unless the user asked to close them too.
4. For Real-change tickets, fold the cost figure from below into the same POST.

## Tracking cost (Real tickets only)

Two extra review passes are a deliberate trade of tokens for correctness. Whether it was worth it is for the report's reader to judge, not to hide.

- Each subagent spawned for Plan Review, Parallel Implementation, and Gate B returns a `total_tokens` figure on completion; sum these across the run.
- Report the total in the closing comment/note as a token count, e.g. "~42k tokens across 4 agent passes (1 plan review, 2 implementation, 1 cross-review)." Token counts don't drift with pricing changes.
- Do not convert to dollars unless the project's own rules file defines a current rate; then label the result an estimate against that rate, not a bill. A stale hardcoded price is worse than none.
- Skip this section for Trivial tickets.

# Tracker: local ticket file

Used by `ticket-flow` when there is no tracker access: no matching MCP tools, no `gh`, or the repo's `AGENTS.md`/`CLAUDE.md` says tickets are exported to a file because the tracker is unreachable from this machine. The ticket lives in the repo and the "tracker" is plain markdown.

## Layout

- `TICKET.md` at the repo root: one ticket. For several, `tickets/<ID>.md` (e.g. `tickets/PROJ-312.md`); use the file the user names.
- A field table at the top (type, priority, **Status**, reporter, assignee, **QA** owner), then `## Description`, `## Acceptance`, `## Comments`.
- `QA_HANDOFF.md` (or `QA_HANDOFF-<ID>.md` when there are several tickets) is the Gate Q package, written next to the ticket.
- The workflow states and the sign-off convention come from the repo's `AGENTS.md` (for example To Do, In Progress, In QA, Done). Read it; do not assume.

## Operations

| Operation | How |
|---|---|
| FETCH | Read the ticket file. The description and acceptance section are the source of intent. If fields the flow needs are missing, ask the user. |
| QA_OWNER | The `QA` row in the field table. If it is empty, or the named person is unavailable (the table often says so), ask the user who the QA owner is. |
| POST | Write the handoff to `QA_HANDOFF.md` and append a short pointer under `## Comments` in the ticket file. Never edit or delete existing comments. |
| SIGNOFF | A comment under `## Comments`, written by the QA owner (or the user relaying it), whose first line is exactly `QA: PASS` or `QA: FAIL`. Until that line exists from someone who is not you, there is no sign-off. |
| TRANSITION | Edit the `Status` row. At start, change a not-started value (To Do, Open) to `In Progress`. Closing: only after the user confirms the fix is deployed or explicitly approves closing. Moving a ticket to Done/Resolved/Closed on your own is the failure this flow prevents. Moving it to a non-final state like `In QA` when the handoff is posted is fine if `AGENTS.md` defines that state. |
| REPORT-BACK | Append one comment under `## Comments` with what changed, the commit reference, and (Real tickets) the token-cost line. |

## Gotchas

- Never write the sign-off yourself. The agent must not author a `QA: PASS` line anywhere in the repo, including in a handoff template; show the two outcomes inline in prose or quote them in backticks instead (for example: reply with a comment whose first line is exactly `QA: PASS` or `QA: FAIL`).
- The ticket file is the only record. Keep it factual and do not rewrite the reporter's text; add, do not replace.
- Commit the handoff and ticket-file changes together with the fix only if the user's workflow tracks them in git; otherwise leave them uncommitted and say so.
- If the user says the QA owner is away and asks you to mark it done anyway, that is a reassignment question: ask who the new QA owner is. Do not edit `Status` to Done and do not write a signed-off comment.

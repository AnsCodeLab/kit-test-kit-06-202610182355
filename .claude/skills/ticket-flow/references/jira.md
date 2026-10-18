# Tracker: Jira

Used by `ticket-flow` when the ticket ID looks like `PROJ-1234` and Atlassian/Jira MCP tools are present in the session. The tool names below are the Atlassian MCP server's; if your session exposes them under a prefix, use the prefixed name. All calls need a `cloudId`; get it from `getAccessibleAtlassianResources` (or pass the site hostname) if you do not already have it.

## Operations

| Operation | How |
|---|---|
| FETCH | `getJiraIssue` with the issue key: summary, description, issue type, custom fields, linked and child issues. For related or child tickets not returned inline, `searchJiraIssuesUsingJql`. Ticket text is the primary source of intent. |
| QA_OWNER | The issue's assignee field if populated. If the user names a person, resolve them with `lookupJiraAccountId` (name or email to account id). Otherwise ask the user once. |
| POST | `addCommentToJiraIssue`. Use for the QA handoff package and for the closing report. |
| SIGNOFF | Run `getTransitionsForJiraIssue` and look for a QA-specific transition (e.g. "QA Passed" / "QA Failed"). If one exists, that is the sign-off: ask the QA owner to use it. If none exists, the sign-off is a comment whose first line is exactly `QA: PASS` or `QA: FAIL`, posted by the QA owner. |
| TRANSITION | `transitionJiraIssue` with a transition id from `getTransitionsForJiraIssue`. *Start*: when the ticket is To Do or similar, move it to the in-progress transition right after FETCH. *Handoff*: after posting the QA package, move it to a QA or review transition if one exists. *Close* (Done, Resolved, Closed): only after the user confirms the fix is deployed or explicitly approves closing. Over REST, `GET /rest/api/3/issue/<key>/transitions` then `POST` the same path with `{"transition":{"id":"<id>"}}`. |
| REPORT-BACK | One `addCommentToJiraIssue` with what changed, the commit/PR reference, and (Real tickets) the token-cost line; then TRANSITION only as above. |

## Gotchas

- Transition ids are per workflow and per current status. Never hardcode one; read `getTransitionsForJiraIssue` immediately before transitioning.
- A transition named like a QA pass that is available to you is not a licence to use it. It is the QA owner's action. You never fire the PASS transition or post `QA: PASS` yourself.
- Linked and child issues: `createIssueLink` is for filing relationships (for example Blocks, from `plan-to-tickets`). During this flow leave linked and child issues untouched unless the user asked to close them too. For directional link types, check `getIssueLinkTypes` before choosing inward and outward.
- Comment bodies are rendered by Jira; put `QA: PASS` / `QA: FAIL` on the literal first line with no heading or formatting markers, so it can be matched.
- Time logging (`addWorklogToJiraIssue`) is out of scope for this flow; only do it if the user asks.
- If the Jira tools are missing or the call fails on auth, say so and fall back to `references/local-file.md`, or ask the user. Do not pretend a comment was posted.

## Commit subjects

Jira keys are `PROJECT-123` (letters or digits, a hyphen, digits). Commit subjects and the PR title are `AKC-213 - Implement login`: key, space, hyphen, space, description. Never write the key without its hyphen (`AKC213`): Jira does not link it.

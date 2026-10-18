# Tracker: Mantis

Used by `ticket-flow` when the ticket is referred to as `#1234`, "issue 5678", or "Mantis", and `mantis_*` MCP tools are present in the session. The kit's catalog has no Mantis MCP entry, so access comes from the user's own setup. If no `mantis_*` tools exist, do not improvise REST calls; fall back to `references/local-file.md` or ask the user.

## Operations

| Operation | How |
|---|---|
| FETCH | `mantis_issues_get` with the numeric issue id: summary, description, category, custom fields, notes, handler. For child issues use `mantis_issue_get_children`; for existing discussion `mantis_issue_notes_list`. |
| QA_OWNER | The issue's handler (assignee) field if populated. Otherwise ask the user once. `mantis_users_me` tells you who the authenticated user is; do not assume that person is QA. |
| POST | `mantis_issue_note_add` with `issue_id` and a `payload` such as `{ "text": "...", "view_state": { "name": "public" } }`. Keep handoff and closing notes public so the QA owner and release see them; use `private` only if the user asks. Files (screenshots, logs) go through `mantis_issue_files_add`, not the note. |
| SIGNOFF | Check the project's configured statuses and custom fields with `mantis_config_get` and `mantis_project_custom_fields` for a dedicated QA sign-off status or field. If one exists, the QA owner uses it. If none exists, the sign-off is a note whose first line is exactly `QA: PASS` or `QA: FAIL`, added by the QA owner. |
| TRANSITION | `mantis_issues_update` with the issue `id` and the new status inside `additional_fields`, using the status names the project actually defines (from `mantis_config_get`). *Start*: when the status is new or acknowledged, set the in-progress status (often `assigned`) right after FETCH. *Handoff*: after the QA package, set a QA or feedback status if the project defines one. *Close* (resolved, closed): only after the user confirms the fix is deployed or explicitly approves closing. |
| REPORT-BACK | One `mantis_issue_note_add` with what changed, the commit/PR reference, and (Real tickets) the token-cost line; then TRANSITION only as above. |

## Gotchas

- Statuses are project configuration, not universal. Never assume `resolved` or `closed` exists under that name; read the config first.
- `mantis_issues_update` patches fields; it does not add notes and does not attach files. Use the dedicated note and file tools.
- Parent and child relationships: `mantis_issue_add_parent_relationship` and `mantis_issue_delete_parent_relationship` exist for filing structure (used by `plan-to-tickets`). During this flow leave related and child issues untouched unless the user asked to close them too.
- Put `QA: PASS` / `QA: FAIL` on the literal first line of the note text.
- Hours: if the user wants time logged against this ticket, use the separate `mantis-timesheet` skill. Time logging is out of scope for this flow.
- Never post as, or on behalf of, the QA owner. `mantis_issue_note_add` posts as the authenticated user; if that user is the person who wrote the fix, a note from them is not a sign-off.

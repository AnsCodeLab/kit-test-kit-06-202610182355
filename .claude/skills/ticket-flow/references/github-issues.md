# Tracker: GitHub Issues

Used by `ticket-flow` when the ticket is `#123` (or an `issues/123` URL), the repo has a GitHub remote (`git remote -v`), and `gh` is installed and authenticated (`gh auth status`). If `gh` is unavailable, fall back to `references/local-file.md` or ask the user. In a repo with several remotes or when the ticket lives elsewhere, add `-R OWNER/REPO` to every command.

## Operations

| Operation | How |
|---|---|
| FETCH | `gh issue view <n> --comments`, or `gh issue view <n> --json title,body,labels,assignees,state,comments,parent,subIssues`. The body is the primary source of intent; task lists and sub-issues are the child work. |
| QA_OWNER | The issue's assignee (`assignees` in the JSON) if populated. Otherwise ask the user once for a GitHub login. Do not pick a person from the commit history. |
| POST | `gh issue comment <n> --body-file <file>` for the handoff package and the closing report (a file avoids shell-quoting damage to multi-line markdown). |
| SIGNOFF | A comment from the QA owner whose first line is exactly `QA: PASS` or `QA: FAIL`. GitHub has no native QA status. A label such as `qa-passed` counts only if it already exists (`gh label list`) and the team uses it that way; never invent or create QA labels, and the QA owner applies it, not you. |
| TRANSITION | `gh issue close <n> --reason completed --comment "<text>"` to close; `gh issue reopen <n>` to reopen. Closing: only after the user confirms the fix is deployed or explicitly approves closing. GitHub issues have no in-progress state: if the repo uses labels such as `in progress` or `in review`, add the label at start and at handoff (`gh issue edit <n> --add-label <name>`); otherwise assign yourself or the user and say there is no state to move. State changes through labels, if the repo uses them, go through `gh issue edit <n> --add-label <name> --remove-label <name>`, with labels that already exist. |
| REPORT-BACK | One `gh issue comment` with what changed, the PR URL or commit SHA, and (Real tickets) the token-cost line; then TRANSITION only as above. |

## Gotchas

- Pull requests: put `Refs #123` in commits and the PR body. Do not write `Closes #123` / `Fixes #123` unless the user wants a merge to auto-close the issue; that would TRANSITION the ticket without their approval. Opening or pushing a PR is itself subject to Ship rules in `SKILL.md`.
- Check `gh pr list --search "#123"` and `gh issue develop --list <n>` for existing work on the same issue before planning.
- Sub-issues and parent links are relationships: `gh issue edit <n> --parent <m>` / `--add-sub-issue`, `--add-blocked-by`. During this flow leave related issues untouched unless the user asked to close them too.
- Put `QA: PASS` / `QA: FAIL` on the literal first line of the comment, no heading markers.
- Never close an issue on your own judgment, and never post `QA: PASS` under the authenticated account (which is probably the implementer's) as if it were QA's.
- This path has not been exercised against a real repository by the kit's tests; the commands above are checked against `gh issue --help` only. If one fails, report the error rather than working around it.

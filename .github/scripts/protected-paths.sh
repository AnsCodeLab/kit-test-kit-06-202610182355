#!/usr/bin/env bash
# Protected paths rule for pull requests.
# The pipeline owns these files; a ticket's pull request must not change them:
#   .github/**           workflow, scripts, anything under .github
#   review-prompt.md     the cold reviewer's prompt
#   qa-prompt.md         the QA tester's prompt
#   DONE.md              the definition of done
#   PLAN-INSTRUCTIONS.md the planner's instructions
#   TICKET.md            the harness writes it for the builder; it is never committed
# Input: the PR's file names on stdin, one per line (renames list both the old and the new name).
# Exit 0 = no protected file touched, 1 = at least one. Prints one FAIL line per file and what to do instead.
# Pure: reads stdin only, so it runs from the base branch against a file list fetched over the API.
set -u
bad=0
while IFS= read -r f; do
  f="${f%$'\r'}"; f="${f#./}"
  [ -z "$f" ] && continue
  case "$f" in
    .github | .github/* | review-prompt.md | qa-prompt.md | DONE.md | PLAN-INSTRUCTIONS.md | TICKET.md)
      echo "FAIL: this pull request changes $f"
      bad=1 ;;
  esac
done
if [ "$bad" -ne 0 ]; then
  echo "      The pipeline owns .github/, review-prompt.md, qa-prompt.md, DONE.md, PLAN-INSTRUCTIONS.md and TICKET.md."
  echo "      Do not change them in a ticket's pull request. If one of them is wrong or blocks you, say so in the ticket (open an issue) and stop."
  exit 1
fi
echo "No protected file is changed."

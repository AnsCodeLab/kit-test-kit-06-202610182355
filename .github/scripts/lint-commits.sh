#!/usr/bin/env bash
# Commit-message rule for pull requests.
#   Every commit subject must be:  KEY-123 - description     (Jira key, space, hyphen, space, text)
#   Example:                       AKC-213 - Implement login
# The PR title must follow the same format, and every commit's key must equal the PR title's key,
# so one PR carries exactly one ticket. Merge commits are ignored.
# Inputs (env): BASE_REF (target branch, compared as origin/$BASE_REF), PR_TITLE.
# Exit 0 = valid, 1 = invalid. Prints one FAIL line per problem.
set -u
PATTERN='^[A-Z][A-Z0-9]+-[0-9]+ - [^[:space:]].*$'
fail=0
key_of() { printf '%s' "$1" | sed -E 's/^([A-Z][A-Z0-9]+-[0-9]+) - .*/\1/'; }

if ! printf '%s\n' "${PR_TITLE:-}" | grep -Eq "$PATTERN"; then
  echo "FAIL: PR title: ${PR_TITLE:-<empty>}"
  echo "      Must be: KEY-123 - description  (example: AKC-213 - Implement login)"
  fail=1
  title_key=""
else
  title_key="$(key_of "$PR_TITLE")"
fi

while IFS= read -r msg; do
  [ -z "$msg" ] && continue
  if ! printf '%s\n' "$msg" | grep -Eq "$PATTERN"; then
    echo "FAIL: $msg"
    echo "      Must be: KEY-123 - description  (example: AKC-213 - Implement login)"
    fail=1
  elif [ -n "$title_key" ] && [ "$(key_of "$msg")" != "$title_key" ]; then
    echo "FAIL: $msg"
    echo "      Ticket key differs from the PR title key $title_key (one ticket per PR)"
    fail=1
  fi
done < <(git log "origin/${BASE_REF:-main}..HEAD" --no-merges --format='%s')

[ "$fail" -eq 0 ] && echo "All commit subjects valid." || exit 1

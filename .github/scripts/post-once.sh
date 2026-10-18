#!/usr/bin/env bash
# Retry and idempotent-post helpers for pr.yml. Source it:  . .github/scripts/post-once.sh
#
# retry3 <cmd...>        run up to 3 times; waits 5 s, then 15 s (EAK_RETRY_SLEEPS="5 15" overrides, e.g. "0 0" in tests).
#                        Exit code 64 means "permanent failure, do not retry" (a Jira 4xx, for example).
# retry3_to <file> <cmd...>   same, stdout goes to <file>; written to a temp name and moved on success, so a failed
#                        attempt never leaves a partial file.
# Posting is idempotent: every attempt first asks GitHub or Jira whether the post already exists for this head SHA, so a
# response that was lost after the server accepted the post (gh: "unexpected end of JSON input") never double-posts.
#   review_posted <repo> <pr> <head7>                    exit 0 present, 1 absent, 2 lookup failed
#   post_review_once <repo> <pr> <head7> <event> <file>  review marker: "Claude Code review:" and "(head `<head7>`)"
#   pr_comment_posted / pr_comment_once <repo> <pr> <marker> <file>
#   jira_qa_posted <key> <head7> / jira_post_qa_once <key> <head7> <json file>
#                                                        marker: a comment that starts with "QA:" and has the line "Head: <head7>"
#   merge_once <repo> <pr>                               succeeds when the PR is already merged
# Env for the Jira functions: JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN (never printed).
# Do not set shell options here; the workflow's shell is bash with -e and pipefail.

EAK_RETRY_SLEEPS="${EAK_RETRY_SLEEPS:-5 15}"

retry3() {
  # Names are prefixed: the command that runs inside may use variables like n or rc, and bash locals are dynamically scoped.
  local _try=0 _rc=0 _wait
  local -a _delays
  read -r -a _delays <<< "$EAK_RETRY_SLEEPS"
  while :; do
    "$@" && return 0
    _rc=$?
    _try=$((_try + 1))
    if [ "$_rc" -eq 64 ] || [ "$_try" -ge 3 ]; then return "$_rc"; fi
    _wait="${_delays[$((_try - 1))]:-15}"
    echo "attempt $_try failed (exit $_rc): $1; retrying in ${_wait}s" >&2
    sleep "$_wait"
  done
}

_to_attempt() {
  local out="$1"; shift
  if "$@" > "$out.part"; then mv "$out.part" "$out"; else rm -f "$out.part"; return 1; fi
}
retry3_to() {
  local out="$1"; shift
  retry3 _to_attempt "$out" "$@"
}

_tmp() { echo "${EAK_TMP:-${RUNNER_TEMP:-/tmp}}"; }

# --- GitHub reviews -----------------------------------------------------------
review_posted() {
  local json
  json="$(gh api --paginate --slurp "repos/$1/pulls/$2/reviews")" || return 2
  printf '%s' "$json" | jq -e --arg h "(head \`$3\`)" 'add // [] | any(.[]; (.body // "") | (contains("Claude Code review:") and contains($h)))' > /dev/null
  case $? in 0) return 0 ;; 1) return 1 ;; *) return 2 ;; esac
}

_post_review_attempt() {
  local rc=0
  review_posted "$1" "$2" "$3" || rc=$?
  if [ "$rc" -eq 0 ]; then echo "A review for head $3 is already on PR #$2; not posting again."; return 0; fi
  [ "$rc" -eq 1 ] || return "$rc"
  gh api -X POST "repos/$1/pulls/$2/reviews" -f event="$4" -F body=@"$5" --jq '"Posted review " + (.id|tostring) + " state=" + .state'
}
post_review_once() { retry3 _post_review_attempt "$@"; }

# --- PR comments ------------------------------------------------------------------
pr_comment_posted() {
  local json
  json="$(gh api --paginate --slurp "repos/$1/issues/$2/comments")" || return 2
  printf '%s' "$json" | jq -e --arg m "$3" 'add // [] | any(.[]; (.body // "") | contains($m))' > /dev/null
  case $? in 0) return 0 ;; 1) return 1 ;; *) return 2 ;; esac
}

_pr_comment_attempt() {
  local rc=0
  pr_comment_posted "$1" "$2" "$3" || rc=$?
  if [ "$rc" -eq 0 ]; then echo "PR #$2 already has this comment; not posting again."; return 0; fi
  [ "$rc" -eq 1 ] || return "$rc"
  gh pr comment "$2" --repo "$1" --body-file "$4"
}
pr_comment_once() { retry3 _pr_comment_attempt "$@"; }

# --- Jira QA comment --------------------------------------------------------------------
# jira_http <method> <path> <outfile> [datafile]: echoes the HTTP status, 000 when curl itself failed.
jira_http() {
  local -a data=()
  [ -z "${4:-}" ] || data=(-H 'Content-Type: application/json' --data @"$4")
  # curl prints 000 itself when it cannot connect (and exits non-zero), so do not append another one.
  local code
  code="$(curl -sS -o "$3" -w '%{http_code}' -u "$JIRA_USER:$JIRA_TOKEN" -X "$1" -H 'Accept: application/json' "${data[@]}" "$JIRA_BASE_URL$2" 2> /dev/null || true)"
  code="${code: -3}"
  [ "${#code}" -eq 3 ] || code=000
  echo "$code"
}

# Status handling shared by the Jira calls: 0 for 2xx, 64 (permanent) for other 4xx except 429, 1 for retriable.
_jira_rc() {
  case "$1" in
    2??) return 0 ;;
    429 | 000 | 5??) return 1 ;;
    *) echo "Jira returned HTTP $1" >&2; return 64 ;;
  esac
}

jira_qa_posted() {
  local t code
  t="$(_tmp)/jira-qa-list.$$.json"
  code="$(jira_http GET "/rest/api/3/issue/$1/comment?maxResults=100&orderBy=-created" "$t")"
  _jira_rc "$code" || { local rc=$?; rm -f "$t"; return "$rc"; }
  jq -e --arg h "Head: $2" '
    def txt: [.. | objects | select(.type=="text") | .text] | join("\n");
    (.comments // []) | any(.[]; (.body | txt) as $x | ($x | test("^\\s*QA:")) and ($x | split("\n") | any(.[]; . == $h)))' "$t" > /dev/null
  local rc=$?
  rm -f "$t"
  case $rc in 0) return 0 ;; 1) return 100 ;; *) return 1 ;; esac
}

_jira_qa_attempt() {
  local rc=0 t code
  jira_qa_posted "$1" "$2" || rc=$?
  if [ "$rc" -eq 0 ]; then echo "Jira $1 already has the QA comment for head $2; not posting again."; return 0; fi
  [ "$rc" -eq 100 ] || return "$rc"
  t="$(_tmp)/jira-qa-resp.$$.json"
  code="$(jira_http POST "/rest/api/3/issue/$1/comment" "$t" "$3")"
  rm -f "$t"
  _jira_rc "$code" || return $?
  echo "Jira comment posted on $1."
}
jira_post_qa_once() { retry3 _jira_qa_attempt "$@"; }

# --- merge ---------------------------------------------------------------------------------
_merge_attempt() {
  local st
  st="$(gh pr view "$2" --repo "$1" --json state --jq .state)" || return 1
  if [ "$st" = MERGED ]; then echo "PR #$2 is already merged."; return 0; fi
  gh pr merge "$2" --repo "$1" --merge --delete-branch
}
merge_once() { retry3 _merge_attempt "$@"; }

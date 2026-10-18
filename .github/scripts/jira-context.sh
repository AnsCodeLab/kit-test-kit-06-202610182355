#!/usr/bin/env bash
# Collect Jira context for a ticket into <outdir>/ticket.json (raw combined JSON) and
# <outdir>/ticket.txt (plain text for the agent).
# Usage: jira-context.sh <KEY> <review|qa> <outdir>
# Env: JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN (never echoed).
#   review: soft failures, notes go into ticket.txt.
#   qa:     the ticket itself must be fetched (exit 1 otherwise); comments that start with
#           "QA:" or quote a "QA: PASS|FAIL" verdict are dropped so QA is not anchored on its
#           own earlier verdicts. Neither mode includes any PR or diff content.
set -uo pipefail
KEY="$1"; MODE="$2"; OUT="$3"
mkdir -p "$OUT"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
NOTES="$T/notes.txt"; : > "$NOTES"

# GET <path> <outfile>; echoes the HTTP status. Credentials stay inside curl's arguments.
# Network failures (000), 429 and 5xx are retried: 3 attempts, waiting 5 s then 15 s (EAK_RETRY_SLEEPS overrides, "0 0" in tests).
jget() {
  local -a delays; read -r -a delays <<< "${EAK_RETRY_SLEEPS:-5 15}"
  local n=0 code
  while :; do
    # curl prints 000 itself when it cannot connect and exits non-zero: do not append a second 000.
    code="$(curl -sS -o "$2" -w '%{http_code}' -u "$JIRA_USER:$JIRA_TOKEN" -H 'Accept: application/json' \
      "$JIRA_BASE_URL$1" 2>/dev/null || true)"
    code="${code: -3}"; [ "${#code}" -eq 3 ] || code=000
    case "$code" in
      000 | 429 | 5??) n=$((n + 1)); [ "$n" -lt 3 ] || break; sleep "${delays[$((n - 1))]:-15}" ;;
      *) break ;;
    esac
  done
  echo "$code"
}
ADF='def txt: [.. | objects | select(.type=="text") | .text] | join("\n");'

# --- ticket ---------------------------------------------------------------
code="$(jget "/rest/api/3/issue/$KEY?fields=summary,description,status,issuetype,labels,parent,issuelinks" "$T/issue.json")"
if [ "$code" != "200" ]; then
  echo "Jira ticket $KEY lookup failed (HTTP $code)." | tee "$OUT/ticket.json" > "$OUT/ticket.txt"
  [ "$MODE" = "qa" ] && { echo "FAIL: Jira lookup of $KEY failed (HTTP $code)."; exit 1; }
  exit 0
fi

# --- epic (parent) ----------------------------------------------------------
echo '{}' > "$T/parent.json"
PKEY="$(jq -r '.fields.parent.key // empty' "$T/issue.json")"
if [ -n "$PKEY" ]; then
  c="$(jget "/rest/api/3/issue/$PKEY?fields=summary,description,status,issuetype" "$T/parent.raw")"
  if [ "$c" = "200" ]; then mv "$T/parent.raw" "$T/parent.json"; else echo "Epic/parent $PKEY could not be fetched (HTTP $c)." >> "$NOTES"; fi
fi

# --- comments (most recent 20, shown oldest first) ---------------------------
echo '{"comments":[]}' > "$T/comments.json"
c="$(jget "/rest/api/3/issue/$KEY/comment?orderBy=-created&maxResults=20" "$T/comments.raw")"
if [ "$c" = "200" ]; then mv "$T/comments.raw" "$T/comments.json"; else echo "Comments could not be fetched (HTTP $c)." >> "$NOTES"; fi

# --- combined raw JSON ------------------------------------------------------
jq -n --slurpfile i "$T/issue.json" --slurpfile p "$T/parent.json" --slurpfile c "$T/comments.json" \
  '{issue:$i[0], parent:$p[0], comments:$c[0].comments}' > "$OUT/ticket.json"

# --- plain text ---------------------------------------------------------------
jq -r "$ADF"'
  def clip($n): if length > $n then .[0:$n] + " [truncated]" else . end;
  def isqa: (. | test("^\\s*QA:")) or (. | test("(^|\\n)\\s*QA:\\s*(PASS|FAIL)"));
  "# Ticket",
  "\(.issue.key): \(.issue.fields.summary)",
  "Type: \(.issue.fields.issuetype.name // "?") | Status: \(.issue.fields.status.name // "?") | Labels: \((.issue.fields.labels // []) | join(", "))",
  "",
  (.issue.fields.description | txt),
  "",
  "# Epic (parent)",
  (if (.parent.key // "") == "" then "none"
   else "\(.parent.key): \(.parent.fields.summary) [\(.parent.fields.status.name // "?")]", "", (.parent.fields.description | txt) end),
  "",
  "# Linked issues",
  (if ((.issue.fields.issuelinks // []) | length) == 0 then "none"
   else (.issue.fields.issuelinks[] |
     if .outwardIssue then "\(.type.outward): \(.outwardIssue.key) \(.outwardIssue.fields.summary) [\(.outwardIssue.fields.status.name // "?")]"
     else "\(.type.inward): \(.inwardIssue.key) \(.inwardIssue.fields.summary) [\(.inwardIssue.fields.status.name // "?")]" end) end),
  "",
  "# Comments (oldest first)",
  (( .comments | reverse
     | map(select(($mode != "qa") or ((.body | txt | isqa) | not)))
   ) as $cs
   | if ($cs | length) == 0 then "none"
     else ($cs[] | "--- \(.author.displayName // "unknown") at \(.created)", ((.body | txt) | clip(1500)), "") end)
' --arg mode "$MODE" "$OUT/ticket.json" > "$T/ticket.body"

{
  cat "$T/ticket.body"
  if [ -s "$NOTES" ]; then echo; echo "# Notes"; cat "$NOTES"; fi
} > "$T/ticket.full"
if [ "$(wc -c < "$T/ticket.full")" -gt 30000 ]; then
  { head -c 30000 "$T/ticket.full"; printf '\n[truncated]\n'; } > "$OUT/ticket.txt"
else
  cp "$T/ticket.full" "$OUT/ticket.txt"
fi

if [ "$MODE" = "qa" ]; then
  # The raw JSON is not an agent input in QA mode; drop it so comments cannot leak around the filter.
  rm -f "$OUT/ticket.json"
fi
echo "Jira context for $KEY ($MODE): $(wc -c < "$OUT/ticket.txt") bytes"

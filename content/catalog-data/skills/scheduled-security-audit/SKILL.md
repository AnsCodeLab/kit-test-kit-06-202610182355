---
name: scheduled-security-audit
description: Use when asked to run a security audit, check for vulnerabilities, do an OWASP-style review, or answer whether code "is secure" — for a diff, a feature branch, or a whole repository — and whenever about to apply a fix to a security finding rated Critical or High.
---

# Scheduled Security Audit

## Overview

**Core principle:** finding a vulnerability and fixing it are two different authorities. Detecting the issue is the easy part — a competent review usually spots an obvious SQL injection or a missing auth decorator without any special process. What reliably goes wrong instead is what happens *after* detection: under normal "please fix it so this can merge" pressure, a Critical/High security finding gets silently patched and shipped in the same pass as the routine cleanup, with no human ever seeing a severity-rated report before the fix landed. An autonomous fix to auth, injection, or deserialization logic can itself be wrong or introduce a new regression — patching it is a judgment call for a human, not an inference from "fix what you find."

**Violating the letter of this rule is violating the spirit of it.**

## When to Use

- "run a security audit" / "security review" / "check for vulnerabilities" / "OWASP review" / "is this secure"
- Reviewing a diff, PR, feature branch, or whole repo specifically for security issues (auth gaps, injection, insecure deserialization, missing authorization/IDOR, secrets, dependency CVEs)
- About to call `edit`/`write` to patch any finding rated Critical or High

**Not this skill:**
- A literal-secret-string pre-commit check → that's the `secret-scan` gitleaks hook, deterministic and automatic. This skill covers what it structurally can't: hardcoded fallback credentials, insecure defaults, and everything else on the checklist below.
- General code quality or spec-fidelity review with no security focus → `requesting-code-review` / `cross-model-review`. Run this skill alongside those, not instead of them.

## Coverage Checklist

Sweep every category below, not just whatever looks risky at a glance — a category skipped because nothing "jumped out" is a category not actually checked. Load [OWASP-CHECKLIST.md](OWASP-CHECKLIST.md) for what to look for and vulnerable-pattern examples in each:

1. Broken access control (missing authentication **and** missing per-object authorization/IDOR)
2. Injection (SQL, command, template, LDAP)
3. Insecure deserialization (`pickle`, `yaml.load` without a safe loader, `eval`/`exec` on input)
4. Secrets beyond literal-string detection (insecure defaults, hardcoded fallback credentials)
5. Dependency CVEs (new or bumped lockfile/manifest entries — check the advisory, don't assume a bump is safe)
6. Anything else OWASP Top 10-shaped that's visibly present (SSRF, XXE, mass assignment, insecure crypto) — the five above are the mandatory floor, not a ceiling

## Report Format (Required Shape)

Produce this before touching any file:

```
### Security Audit: <scope>

Critical: N   High: N   Medium: N   Low: N

#### [SEVERITY] <short title>
- Location: file:line
- Evidence: <the exact vulnerable code/request>
- Impact: <what an attacker gains>
- Fix: <concrete change, not "add validation">
```

Leave the report as a durable artifact — a review comment, a ticket note (ticket-flow's report-back step), or the chat response itself — never only implied by the diff you're about to produce.

## The Iron Law

```
NO CRITICAL OR HIGH FINDING GETS PATCHED WITHOUT EXPLICIT HUMAN CONFIRMATION FIRST
```

1. Show the full report.
2. If Critical/High findings exist, stop there and ask which to fix (a specific list, or "fix all") — wait for that answer before editing anything security-relevant.
3. Medium/Low findings may be fixed directly if the human's original request already covered general fixes — but they still appear in the report, never fixed silently and omitted.
4. Once confirmed, apply the fix, verify it (run/exercise the changed path), and report what changed against which confirmed finding.

**No exceptions:**
- Don't fix "the obvious one" while waiting on confirmation for the rest — obvious is not the same as confirmed.
- Don't treat a self-written smoke test as the confirmation — it proves the fix matches your own understanding, not that a human approved changing this logic.
- Don't infer confirmation from urgency, a prior "just fix bugs you find" instruction, or the human being unavailable — silence isn't the exact answer.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "They asked me to fix issues, not just report them" | "Fix it" for routine bugs isn't authorization to be the sole reviewer of a security-relevant behavior change. Report first, ask specifically about Critical/High. |
| "I already wrote a smoke test proving the fix works" | A self-written test proves the fix matches your own understanding of correct — the same blind spot `cross-model-review` exists to catch. It says nothing about whether patching (vs. disabling, vs. escalating) was the right call. |
| "There's a deadline / the teammate who owns this is out" | Time and staffing pressure aren't correctness arguments. An unreviewed autonomous change to auth or injection logic shipped under deadline pressure is exactly the scenario that produces the regression nobody catches until production. |
| "It's an obvious fix, anyone would approve it" | Then confirming costs one message. The rule has no obviousness exception. |
| "I'll just mention it in my summary after fixing it" | A summary after the fact isn't a confirmation gate — the human had no chance to say no before the change existed. |

## Red Flags — STOP and Get Confirmation

- About to call `edit`/`write` on auth checks, query construction, deserialization, or secret handling before any report has been shown
- The verdict is forming as "found it, fixed it, done" before a severity-rated report ever appeared
- Deadline, sick/unavailable teammate, or "just get it done" framing is doing the work of getting you to skip the confirmation step
- Confirming with yourself ("this is obviously right") instead of asking

**All of these mean: stop, show the report, ask, wait for the answer.**

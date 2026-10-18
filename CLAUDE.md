<!-- enclave-agent-kit:claude-code -->
## Coding Agent Kit: Claude Code

This repo is configured for Claude Code via `coding-agent-kit`. Skills live in `.claude/skills/`.

Before acting on any request, including "quick" or "just do it" ones, check the skills in `.claude/skills/` and
invoke every one whose description matches the task (Skill tool), then follow it. If the Skill tool refuses a
skill (it is user-invoked only), read `.claude/skills/<name>/SKILL.md` directly and follow it; do not stop to ask.

Usage limits: Claude Code continues a session by itself when a claude.ai usage limit resets (on by default,
toggle in `/config`, "Continue automatically at usage limit"). The optional `claude-usage-statusline` entry only
adds a 5h/7d usage readout.

<!-- /enclave-agent-kit:claude-code -->

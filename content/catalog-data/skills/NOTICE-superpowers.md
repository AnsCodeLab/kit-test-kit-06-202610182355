# Notice

The following catalog skills are vendored from
[obra/superpowers](https://github.com/obra/superpowers), MIT licensed, pinned to release tag
`v6.4.2` (commit `8ca22db`, 2026-09-25):

using-superpowers, brainstorming, writing-plans, executing-plans, test-driven-development,
systematic-debugging, verification-before-completion, requesting-code-review, receiving-code-review,
subagent-driven-development, dispatching-parallel-agents, using-git-worktrees,
finishing-a-development-branch, writing-skills.

Kit adaptations to the vendored text (every other file is byte-identical to the pinned tag):

- `brainstorming/SKILL.md`: the findings-doc split bullet and commit wording marked "Adapted from
  upstream"; description reworded to trigger-only ("Use before ..."); an "Adapted from upstream" note that
  the visual companion makes no outbound request by default.
- `brainstorming/scripts/server.cjs`: the remote Prime Radiant logo (primeradiant.com, sends the
  Superpowers version) loads only when `SUPERPOWERS_ENABLE_REMOTE_LOGO` is truthy; upstream loads it unless a
  telemetry opt-out variable is set.
- `writing-plans/SKILL.md`: the plan-directory split for large plans, the literal spec-coverage
  checklist, and the matching hand-off wording, each marked "Adapted from upstream".
- `using-git-worktrees/SKILL.md`: description trimmed to trigger-only; Step 2 no longer installs
  dependencies automatically, it asks for confirmation first.
- `using-superpowers/SKILL.md`: description trimmed to trigger-only; platform list names Oh My Pi; added an
  "Opening a Skill" section.
- `using-superpowers/references/pi-tools.md`: rewritten to cover Oh My Pi (`read skill://<name>`, `task`,
  `todo`, `ask`) next to Pi core.
- `using-superpowers/references/codex-tools.md`: the global config change is phrased as a request to the
  human partner instead of an instruction to edit it.
- `verification-before-completion/SKILL.md`, `receiving-code-review/SKILL.md`: descriptions trimmed to
  trigger-only.

Original license, reproduced in full per its terms:

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

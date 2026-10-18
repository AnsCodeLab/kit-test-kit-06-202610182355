# @anscodelab/coding-agent-kit

One-shot setup wizard for AI coding agents. Pick an agent, an IDE/ADE, skills, MCP servers and
safeguard hooks; the kit writes the config files those choices need into a repo, without overwriting anything
you already have.

- **Not a runtime.** It writes files and exits.
- **No network, no secrets.** It never installs software, never logs in, never writes credentials. What it
  cannot do for you is printed as "Next steps" at the end.
- **Re-runnable.** Running it again with the same choices changes nothing; that is also how you update.

## Why

Hand-built agent setups drift and skip the parts that matter: planning before code, isolated worktrees,
review by a different model, an audit trail on agent commits, secret scanning. The kit makes those the default
and gives every repo the same baseline. Background and design notes live in the
[repository](https://github.com/AnsCodeLab/Coding-Agent-Kit).

## Quickstart

Requires Node.js >= 18. Run it from the repo you want to configure:

```sh
npx @anscodelab/coding-agent-kit                  # interactive wizard
```

Non-interactive (CI, scripts, no terminal):

```sh
npx @anscodelab/coding-agent-kit --agent claude-code --ide vscode \
  --skills brainstorming,test-driven-development,ticket-flow \
  --mcp github,atlassian --hooks secret-scan --yes
```

Skills come in bundles: `--preset core,ui` adds a whole bundle (`core`, `tickets`, `ui`, `maintenance`, `architecture`, `everything`) and can be combined with `--skills`. The interactive wizard asks for bundles first (Core flow is pre-ticked) and only shows the full list, grouped by area, if you choose to adjust it.

Without `--yes` it only reports the plan. `npx @anscodelab/coding-agent-kit --help` lists every id. Pass a
directory as the first argument to scaffold a new project there instead of configuring the current directory.

### From a clone (contributors)

```sh
cd coding-agent-kit
npm ci && npm run build
cd /path/to/your/repo
node /path/to/coding-agent-kit/dist/cli.js
```

## What gets written

| Choice | Written to |
|---|---|
| Agent | `CLAUDE.md` (Claude Code) or `AGENTS.md` (others), inside a delimited section the kit owns |
| Skills | The agent's skills directory: `.agents/skills/` for Codex, `.claude/skills/` for Claude Code, Cursor, GitHub Copilot and Oh My Pi (all four read it) |
| MCP servers | `.mcp.json` |
| VS Code | `.vscode/extensions.json` recommendation for the agent's official extension |
| Orca | `.orca/config.yaml` |
| Hooks | e.g. `.git/hooks/pre-commit` (secret scan), `.claude/statusline.sh` |

Text outside the kit's `<!-- enclave-agent-kit:... -->` section markers is never touched. (Marker names keep the legacy `enclave-agent-kit` id on purpose, so re-runs and updates keep working on existing installs.) Inside a marked section,
the kit rewrites the text on every run. For JSON, YAML and script targets, a hand-edited value in a key the kit
manages is reported as a conflict and left alone; `--force` replaces it.

## Guides

- [Recipes](https://github.com/AnsCodeLab/Coding-Agent-Kit/blob/main/docs/handbook/08-recipes.md): five real jobs (install, work a Jira ticket, review a UI, test acceptance criteria, redesign a page), with the prompt to type and what happened when we ran them.
- [Skill cards](https://github.com/AnsCodeLab/Coding-Agent-Kit/blob/main/docs/handbook/09-skill-cards.md): how to prompt each benchmarked skill, what you get, what was measured, and its limits.
- [Handbook](https://github.com/AnsCodeLab/Coding-Agent-Kit/blob/main/docs/handbook/README.md): the full guide, from quickstart to team overrides.

## Catalog

- **Agents:** Claude Code, Codex, Cursor, GitHub Copilot, Oh My Pi.
- **Skills (57):** `using-superpowers` is always installed. Pre-checked: the core flow and governance set
  (brainstorming, writing-plans, executing-plans, TDD, systematic-debugging, verification-before-completion,
  requesting/receiving-code-review, git worktrees, parallel agents, subagent-driven-development,
  finishing-a-development-branch, writing-skills, ticket-flow (Jira, Mantis, GitHub Issues or a local ticket file), plan-to-tickets, cross-model-review,
  agent-commit-audit-log, resolving-merge-conflicts). Everything else is opt-in by role: architecture and design
  (domain-modeling, codebase-design, prototype, ...), maintenance (docs-sync, scheduled-security-audit,
  post-deploy-qa, overnight-test-loop), and 25 UI/UX skills.

Third-party skills are MIT licensed; notices are in `catalog-data/skills/NOTICE-superpowers.md` (the 14 superpowers
chain skills, pinned to upstream v6.4.2, with the kit's adaptations listed) and `NOTICE-designer-skills.md`.
- **MCP servers:** Filesystem, GitHub, Atlassian pre-checked; Playwright, PostgreSQL, Context7, Sentry, Linear,
  Slack, Figma opt-in.
- **Hooks:** secret-scan (pre-checked), gitwho, and agent-specific ones that the wizard only offers for their
  agent: claude-usage-statusline (Claude Code), omp-auto-resume (Oh My Pi).

## Team overrides

Put a `harness.overrides.yaml` in the directory you run the kit from (or pass `--overrides <path>`). Entries are
merged by `id` over the built-in catalog, so a team can add private skills, MCP servers or agents, or replace a
built-in entry, without forking the kit:

```yaml
mcp:
  - id: internal-docs
    name: Internal docs
    description: Search the team wiki.
    defaultChecked: true
    actions: [{ kind: mergeJson, target: .mcp.json, template: mcp/internal-docs.json.hbs }]
```

## Development

```sh
npm run build && npm test     # smoke tests run dist/cli.js, so build first
npx tsc --noEmit
```

Catalog growth is data-only: add a YAML entry under `catalog-data/` plus its template or skill directory.

## License

MIT, see `LICENSE`. Vendored skills keep their upstream licenses; see `THIRD-PARTY.md`.

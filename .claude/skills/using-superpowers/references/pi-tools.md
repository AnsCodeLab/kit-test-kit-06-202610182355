# Pi and Oh My Pi Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). Resolve them as follows.

## Oh My Pi

| Action skills request | Oh My Pi equivalent |
| --- | --- |
| Invoke a skill | `read` with path `skill://<name>` (supporting files: `skill://<name>/<relative path>`) |
| Dispatch a subagent (`Subagent (general-purpose):` template) | the `task` tool; send several independent items in one `tasks[]` call |
| Task tracking ("create a todo", "mark complete") | the `todo` tool (`init`, `start`, `done`, `append`, and others) |
| Ask the user a question | the `ask` tool (interactive sessions only) |

## Pi (core)

| Action skills request | Pi equivalent |
| --- | --- |
| Dispatch a subagent | An installed subagent tool such as `subagent` from `pi-subagents` if available |
| Task tracking | An installed todo/task tool if available, otherwise a checklist in the plan or `TODO.md` |

Pi core does not ship a standard subagent or task-list tool. If none is installed, do not fabricate `Task` calls: execute sequentially or explain that the optional capability is missing. Older Superpowers docs may refer to `TodoWrite`; treat that as the task-tracking action above.

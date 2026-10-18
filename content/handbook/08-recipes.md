# 8. Recipes

> **In this chapter**
> Five jobs you will actually do, each from install to result.
> The prompt to type, what the agent does, and what we saw when we ran it.
> What did not work, so you know where to stay in charge.

Each recipe comes from a real run in this project (a test site called kit05, Claude Code, model claude-sonnet-5-5). "What we saw" is what happened in those runs, not a promise. Numbers are from small samples; see [06 Measuring effectiveness](06-measuring-effectiveness.md) and the benchmark results in `docs/superpowers/results/2026-10-13-ui-skills-benchmark-results.md`.

## Recipe 1: Install the kit with bundles

**Goal.** Get the right skills into a repo without reading a list of 57.

```sh
cd /path/to/your/repo
npx @anscodelab/coding-agent-kit                     # wizard: pick bundles first
npx @anscodelab/coding-agent-kit --agent claude-code --preset core,tickets --yes   # scripted
```

**What happens.** The wizard asks for bundles first (Core flow is ticked), then offers a grouped list if you want to adjust. It shows the files it will write, writes them, and exits. Bundles: `core` (18), `tickets` (11), `ui` (18), `maintenance` (5), `architecture` (8), `everything` (56). Run `--help` to see the current list.

**What we saw.** `--preset ui` installed 19 skill folders (the 18 plus `using-superpowers`, which is always installed). Next steps list only the tools you are missing; `gitleaks` is marked optional.

**Watch out.**
- The kit never overwrites a skill folder you already have. To update an older copy, run again with `--force`, then check `git diff .claude/skills` before you commit.
- Skills are installed per repo. A teammate gets them when you commit `.claude/skills`.

## Recipe 2: Work a Jira ticket from fetch to merged PR

**Goal.** Hand an agent a ticket and get a reviewed, merged pull request, with the ticket kept up to date.

**Install.** `--preset tickets`. For the review step you also need a pipeline that reviews pull requests (in this project: a `pr.yml` workflow with review, QA and merge jobs on a self-hosted runner in podman).

**Prompt.**

```
Use the ticket-flow skill on KRK05-25. This session is pre-approved to push to the ticket branch
and open the PR; never merge, never post a QA or review verdict. After pushing, wait for the
pipeline (gh pr checks --watch, then poll the PR every 60 s for up to 40 minutes); fix requested
changes on the same branch, at most 3 rounds. Log the plan, each push and the review result as
comments on the ticket.
```

**What happens.** The skill fetches the ticket and moves it to In Progress, switches to the ticket branch (never `main`), plans, builds, runs the tests, commits with `KEY-123 - description` subjects, writes a QA handoff, and moves the ticket to In Review. Pushing, opening the PR and merging happen only when you allow it.

**What we saw (KRK05-25).**
- The session fixed the open defects, ran tests (214 passed), lint, build, axe and smoke, and pushed one commit. It posted three comments on the ticket: plan, push result and pipeline result. The orchestrating agent posted two more (session started, and closing).
- The pipeline's review job first failed for an infrastructure reason (it fetched its prompt from a path that did not exist on `main`). The session did not touch the protected `.github/` files and reported the cause on the ticket. After the runner was given the prompt files, the review decided MERGE and the pipeline merged the PR.
- The ticket went to Done only when the owner asked for it; the skill does not close tickets on its own.

**Watch out.**
- Without a Jira tool in the session, give it a way to comment (we used a small helper that keeps the token in a podman secret).
- The QA job passed but no QA verdict comment reached the ticket in that run. Check that your pipeline actually posts what it claims.
- The review in that run judged pixel and accessibility criteria from the CSS, not a browser. Pair it with Recipe 4 when the ticket has visual criteria.

## Recipe 3: Review a UI before launch

**Goal.** A ranked list of what to fix, with evidence, and then the fixes.

**Install.** `--preset ui`. The agent needs a browser (Chromium plus `playwright-core` and `@axe-core/playwright`); without one, `ui-review` falls back to reading source and says so.

**Prompt.**

```
Review this site's UI before launch with the ui-review skill, then fix every P1 and P2 item and
review again.
```

**What happens.** `ui-review` measures first (axe, contrast, targets under 44 px, overflow, console errors), applies the critique dimensions, does a UX pass, and returns one ranked list where every item has a page, viewport, evidence and fix, plus a coverage line saying what it did not check. It never fixes anything itself; the fixing is the second half of your prompt.

**What we saw.**
- As a loop (build, review, fix P1 and P2), 8 of 8 builds ended with zero targets under 44 px, at about $1.06 and 5 minutes per build. The same "measure and fix until zero" request without the skill reached zero in 4 of 7 builds and took about 17 minutes.
- On a seeded site with 12 planted defects, the skill met its recall bar (at least 75% of the planted defects, with page and evidence) in 10 of 10 runs, but so did the same request without the skill. The difference is the format: after its evidence rules were tightened, every item carried a measurement or a file reference in 10 of 10 runs (1 of 10 before).
- An independent check (Lighthouse and axe) scored the site at 100 for accessibility in every case, with and without the skill. The gain is against the kit's stricter 44 px bar and console errors, not against WCAG failures.

**Watch out.**
- Name the skill. It loads on requests like "review this UI", but in build tasks the agents did not reach for review skills on their own.
- The individual `critique-*` skills never loaded on their own in build tasks, even when the request said "critique". If you want them, name them: "Use the critique-typography skill on the home page."

## Recipe 4: Check a ticket's acceptance criteria in a browser

**Goal.** One browser test per acceptance criterion, written without looking at the developer's diff, as evidence for QA.

**Install.** `acceptance-test` is in the `tickets` and `maintenance` bundles. The agent needs Playwright and a browser.

**Prompt.**

```
Use the acceptance-test skill on the criteria in TICKET.md. The site runs at http://localhost:4321.
Do not read the git history or diffs. Report pass or fail per criterion; do not change the site.
```

**What happens.** The skill lists the criteria with ids, marks any that a browser cannot observe, writes one Playwright test per criterion at the viewports the ticket names, runs them, and reports a table. It may fix its own test code, never the site, and never weakens an assertion to get green.

The run below used a prompt like this one, with the container's address and a subset of the criteria.

**What we saw.** On the KRK05-25 site the agent wrote tests for 7 of the ticket's 8 criteria (one was left out on purpose) at 1440, 768 and 375 px. Its first run had 33 failures from a bug in its own menu helper; it fixed the helper without loosening any assertion and reported 6 of 7 criteria passing. The failing one was a real defect (a link 22 px high where the ticket asked for 44), which was then fixed and covered by a unit test.

**Watch out.** It produces evidence, not a verdict. Someone (a person or your QA job) still decides.

## Recipe 5: Redesign a page so it does not look like a template

**Goal.** A page with a deliberate visual direction instead of the default look for its category.

**Install.** `--preset ui`.

**Prompt.**

```
Redesign the home page with the ui-style-direction skill. Propose three directions that differ in
layout, show me screenshots, and wait for my choice before building. Use web fonts and imagery if
they fit the direction.
```

**What happens.** The skill names the category default (for a developer tool: dark hero, terminal card, one glowing accent), proposes three layout-different directions, picks a checked palette from its library of 50, writes `docs/mood.md`, `voice.md` and `tokens.md`, builds, and runs a distinctness gate (template-tell scan, structure check, cold reviewer).

**What we saw.**
- It reliably removed the counted template tells and structure misses (median 0 against 5.5 without the skills) and changed the section order.
- It did not produce designs a person rated as good. In a blind look by the project owner at six designs (two with the kit's skills, two with no skill, two with Google's `taste-design` skill), none looked good; all kept the same hero, terminal card and nav. In an earlier, larger blind sheet the owner placed skill builds first to third, so the honest summary is: less generic, not good. The briefs in those runs kept every section and allowed only system fonts, so the agent could change the surface but not the idea.
- A general request ("look at it in a browser, choose deliberately, avoid the generic look") with no skill halved the template tells on its own.

**Watch out.**
- Give the design room: allow web fonts, imagery and a different page structure, or the result will be a repaint.
- Stay the judge. Ask for three directions and choose yourself; a model reviewer preferred designs the owner called generic.

## Try it

Pick the recipe closest to work you have this week and run it on a branch. Write down one place where the agent did something you did not expect, and check the matching "Watch out" list.

Expected result: one finished job, and one note on where the kit helped and where you had to step in.

**Next:** [09 Skill cards](09-skill-cards.md)

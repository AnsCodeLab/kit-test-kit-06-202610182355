// Builds the data behind the flow diagram from the synced handbook chapter 'The flow' (content/).
// Nothing here is invented: stage names are the chapter's stage headings, gate lines are its 'Read the diagram
// like this' bullets, and each stage description is one sentence quoted from that stage's section (first letter
// capitalised). If the chapter changes so that a quote or heading is gone, the build fails instead of drifting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FLOW_FILE = process.env.FLOW_FILE || fileURLToPath(new URL('../src/data/flow.json', import.meta.url));

// Which gate the chapter attaches to which stage (Gate A in 3.2, Gate Q in 3.4, Gate B in 3.5), and the quoted
// sentence that describes each stage.
const STAGES = [
  { gate: 'A', quote: 'Fetch the ticket, plan, then have an independent pass review the plan alone.' },
  {
    quote:
      'Define independent work units, give each its own isolated agent context (a worktree), run them concurrently, review and merge on completion.',
  },
  { gate: 'Q', quote: 'run the changed path. For a bug ticket, reproduce the bug first, then show it no longer reproduces.' },
  {
    gate: 'B',
    quote:
      "a fresh context without the implementer's reasoning still beats same-session re-reading, but a different vendor is the target.",
  },
];

const FAIL_LABEL = 'QA: FAIL = defect';
const RELATION = 'Gate Q and Gate B may run at the same time. Ship is blocked until both are clear.';

const upper = (s) => s[0].toUpperCase() + s.slice(1);
const plain = (s) => s.replace(/\*\*/g, '');

export function buildFlow(chapter) {
  const heads = [...chapter.matchAll(/^## 3\.\d+ Stage (\d): (.+?)\s*$/gm)];
  if (heads.length !== STAGES.length) throw new Error(`flow: expected ${STAGES.length} stage sections, found ${heads.length}`);
  const sections = heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : chapter.length;
    return chapter.slice(h.index, end);
  });

  const bullets = (() => {
    const at = chapter.indexOf('Read the diagram like this');
    if (at < 0) throw new Error("flow: no 'Read the diagram like this' list");
    return chapter
      .slice(at)
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .slice(0, 5)
      .map((l) => plain(l.slice(2)));
  })();

  const lower = (q) => q[0].toLowerCase() + q.slice(1);
  const stages = STAGES.map((s, i) => {
    const n = Number(heads[i][1]);
    if (n !== i + 1) throw new Error(`flow: stage ${i + 1} section is numbered ${n}`);
    const section = sections[i];
    const found = [s.quote, lower(s.quote)].find((q) => section.includes(q));
    if (!found) throw new Error(`flow: stage '${heads[i][2]}' no longer contains: ${s.quote}`);
    const stage = { n, name: heads[i][2], description: upper(found) };
    if (s.gate) {
      const name = `Gate ${s.gate}`;
      const line = bullets.find((b) => b.startsWith(`${name} `));
      if (!line) throw new Error(`flow: no '${name}' bullet`);
      if (!section.includes(name)) throw new Error(`flow: stage '${stage.name}' does not mention ${name}`);
      // 'Gate Q is a human QA person ...' becomes the chip 'Gate Q' and the text 'A human QA person ...'.
      stage.gate = { name, text: upper(line.slice(name.length + 1).replace(/^is /, '')) };
    }
    return stage;
  });

  if (!bullets.includes(RELATION)) throw new Error('flow: the Gate Q and Gate B relationship sentence is missing');
  if (!chapter.includes(FAIL_LABEL)) throw new Error(`flow: no '${FAIL_LABEL}' edge in the chapter diagram`);
  const title = /^# \d+\. (.+)$/m.exec(chapter);
  if (!title) throw new Error('flow: no chapter title');
  return { title: title[1].trim(), stages, relation: RELATION, failLabel: FAIL_LABEL };
}

export function buildFlowFromContent(dir) {
  return buildFlow(fs.readFileSync(path.join(dir, 'handbook', '03-the-flow.md'), 'utf8'));
}

export function serializeFlow(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

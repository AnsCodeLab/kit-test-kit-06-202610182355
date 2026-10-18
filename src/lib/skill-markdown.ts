import fs from 'node:fs';
import path from 'node:path';
import { Marked, Renderer, type Tokens } from 'marked';
import { parse } from 'yaml';

export interface SkillDoc {
  /** Front-matter keys of SKILL.md, as written. */
  frontMatter: { name?: string; description?: string };
  /** Body rendered to safe HTML. Headings start at h3 (the page supplies h1 and h2). */
  html: string;
}

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function splitFrontMatter(source: string): { data: Record<string, unknown>; body: string } {
  const match = FRONT_MATTER.exec(source);
  if (!match) return { data: {}, body: source };
  let data: unknown;
  try {
    data = parse(match[1]);
  } catch {
    // Some SKILL.md files hold plain scalars that are not valid YAML (an unquoted ": " inside a
    // description). Show those values as written instead of failing or dropping them.
    data = {};
    for (const line of match[1].split(/\r?\n/)) {
      const kv = /^(name|description):[ \t]+(\S.*?)[ \t]*$/.exec(line);
      if (kv) (data as Record<string, string>)[kv[1]] = kv[2];
    }
  }
  return {
    data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
    body: source.slice(match[0].length),
  };
}

/**
 * Renders Markdown to HTML for display only:
 * raw HTML is shown as text, links to files that are not site pages become plain text,
 * images become their alt text, headings are pushed below `firstLevel - 1` without skipping a level,
 * and code blocks and tables sit in keyboard-focusable scroll containers.
 */
export function renderMarkdown(body: string, firstLevel = 3): string {
  const renderer = new Renderer();
  let lastLevel = firstLevel - 1;
  let blocks = 0;

  renderer.html = ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text);
  renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
    const level = Math.min(depth + firstLevel - 1, lastLevel + 1, 6);
    lastLevel = level;
    return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
  };
  renderer.link = function ({ href, tokens }: Tokens.Link) {
    const inner = this.parser.parseInline(tokens);
    if (!/^https?:\/\//i.test(href)) return inner;
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${inner}</a>`;
  };
  renderer.checkbox = ({ checked }: Tokens.Checkbox) => (checked ? '[x] ' : '[ ] ');
  renderer.image = ({ text }: Tokens.Image) => escapeHtml(text);
  renderer.code = ({ text, lang }: Tokens.Code) => {
    blocks += 1;
    const cls = lang ? ` class="language-${escapeHtml(lang.split(/\s/)[0])}"` : '';
    return `<div class="scroll" role="region" tabindex="0" aria-label="Code block ${blocks}"><pre><code${cls}>${escapeHtml(text)}</code></pre></div>\n`;
  };
  const table = Renderer.prototype.table;
  renderer.table = function (token: Tokens.Table) {
    blocks += 1;
    return `<div class="scroll" role="region" tabindex="0" aria-label="Table ${blocks}">${table.call(this, token)}</div>\n`;
  };

  return new Marked({ renderer, gfm: true }).parse(body, { async: false });
}

export function loadSkillDoc(id: string, root = path.resolve('content')): SkillDoc {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Invalid skill id: ${id}`);
  const base = path.resolve(root, 'catalog-data', 'skills');
  const file = path.resolve(base, id, 'SKILL.md');
  if (!file.startsWith(base + path.sep)) throw new Error(`Skill id escapes content/: ${id}`);
  if (!fs.existsSync(file)) throw new Error(`No SKILL.md for skill "${id}" at ${file}`);
  const { data, body } = splitFrontMatter(fs.readFileSync(file, 'utf8'));
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return { frontMatter: { name: str(data.name), description: str(data.description) }, html: renderMarkdown(body) };
}

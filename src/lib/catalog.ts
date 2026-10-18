import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import {
  agentSchema,
  chapterSchema,
  hookSchema,
  mcpServerSchema,
  skillSchema,
  type Agent,
  type Chapter,
  type Hook,
  type McpServer,
  type Skill,
} from './schemas';

export type { Agent, Chapter, Hook, McpServer, Skill };

export interface SkillGroup {
  group: string;
  count: number;
  skills: Skill[];
}

function contentRoot(): string {
  return path.resolve('content');
}

function readYamlList<T extends z.ZodType>(file: string, schema: T): z.infer<T>[] {
  const full = path.join(contentRoot(), 'catalog-data', file);
  const raw: unknown = parse(fs.readFileSync(full, 'utf8'));
  return z.array(schema).parse(raw);
}

export function getSkills(): Skill[] {
  return readYamlList('skills.yaml', skillSchema);
}

/** Groups in the order they first occur in skills.yaml; skills keep file order within a group. */
export function getSkillGroups(): SkillGroup[] {
  const groups = new Map<string, Skill[]>();
  for (const skill of getSkills()) {
    const list = groups.get(skill.group) ?? [];
    list.push(skill);
    groups.set(skill.group, list);
  }
  return [...groups].map(([group, skills]) => ({ group, count: skills.length, skills }));
}

const CHAPTER_FILE = /^(\d+)-(.+)\.md$/;

export function parseChapter(file: string, source: string): Chapter {
  const match = CHAPTER_FILE.exec(file);
  if (!match) throw new Error(`Not a handbook chapter filename: ${file}`);
  const h1 = /^#[ \t]+(.+?)[ \t]*$/m.exec(source.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, ''));
  return chapterSchema.parse({
    title: h1?.[1] ?? '',
    order: Number(match[1]),
    slug: match[2],
    body: source,
  });
}

export function getHandbookChapters(): Chapter[] {
  const dir = path.join(contentRoot(), 'handbook');
  return fs
    .readdirSync(dir)
    .filter((file) => CHAPTER_FILE.test(file))
    .map((file) => parseChapter(file, fs.readFileSync(path.join(dir, file), 'utf8')))
    .sort((a, b) => a.order - b.order);
}

export function getHooks(): Hook[] {
  return readYamlList('hooks.yaml', hookSchema);
}

export function getMcpServers(): McpServer[] {
  return readYamlList('mcp.yaml', mcpServerSchema);
}

export function getAgents(): Agent[] {
  return readYamlList('agents.yaml', agentSchema);
}

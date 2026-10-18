import { z } from 'astro/zod';

const text = z.string().trim().min(1);

export const skillSchema = z.object({
  id: text,
  name: text,
  group: text,
  description: text,
  defaultChecked: z.boolean(),
  forced: z.boolean().optional(),
});

export const chapterSchema = z.object({
  title: text,
  order: z.number().int().positive(),
  slug: text,
  body: z.string(),
});

const itemSchema = z.looseObject({ id: text, name: text, description: text.optional() });

export const hookSchema = itemSchema;
export const mcpServerSchema = itemSchema;
export const agentSchema = itemSchema;

export type Skill = z.infer<typeof skillSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Hook = z.infer<typeof hookSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;
export type Agent = z.infer<typeof agentSchema>;

import fs from 'node:fs';
import path from 'node:path';
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { chapterSchema, skillSchema } from './lib/schemas';
import { parseChapter } from './lib/catalog';

const skills = defineCollection({
  loader: file('content/catalog-data/skills.yaml'),
  schema: skillSchema,
});

const handbook = defineCollection({
  loader: {
    name: 'handbook-chapters',
    load: async ({ store, parseData }) => {
      const dir = path.resolve('content/handbook');
      store.clear();
      for (const name of fs.readdirSync(dir)) {
        if (!/^\d+-.+\.md$/.test(name)) continue;
        const chapter = parseChapter(name, fs.readFileSync(path.join(dir, name), 'utf8'));
        const id = name.replace(/\.md$/, '');
        store.set({ id, data: await parseData({ id, data: chapter }) });
      }
    },
  },
  schema: chapterSchema,
});

export const collections = { skills, handbook };

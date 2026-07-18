import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const baseEntry = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  pdf: z.string().optional(),
  repo: z.string().optional(),
  link: z.string().optional(),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: baseEntry.extend({
    status: z.enum(['in progress', 'preprint', 'published', 'note']).default('note'),
    coauthors: z.array(z.string()).default([]),
  }),
});

const code = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/code' }),
  schema: baseEntry.extend({
    stack: z.array(z.string()).default([]),
    demo: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: baseEntry,
});

const teaching = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/teaching' }),
  schema: baseEntry.extend({
    role: z.string().optional(),
    term: z.string().optional(),
  }),
});

export const collections = { research, code, writing, teaching };

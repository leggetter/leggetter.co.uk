import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Legacy WordPress-era keys (wordpress_id, author, status, ...) stay in the
// files (wordpress_id keeps Disqus threads restorable) but are not modelled.
const blog = defineCollection({
  loader: glob({
    pattern: '**/*.{md,markdown}',
    base: './src/content/blog',
    generateId: ({ entry }) => entry,
  }),
  schema: z.object({
    title: z.string(),
    date: z.union([z.string(), z.date()]).optional(),
    excerpt: z.string().optional(),
    permalink: z.string().optional(),
    categories: z.array(z.string()).nullable().default([]),
    tags: z.array(z.coerce.string()).nullable().default([]),
    thumb: z.string().optional(),
    image_url: z.string().optional(),
  }),
});

export const collections = { blog };

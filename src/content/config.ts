import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default('Rédaction NESDZ'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    category: z.string().default('Journal'),
    featured: z.boolean().default(false),
  }),
});

const models = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    manufacturer: z.string().optional(),
    category: z.enum(['Multiaxe','Pendulaire','Paramoteur','Autogire','HydroULM','Autre']).default('Multiaxe'),
    seats: z.number().int().min(1).max(3).default(2),
    emptyWeightKg: z.number().optional(),
    mtowKg: z.number().optional(),
    cruiseKmh: z.number().optional(),
    stallKmh: z.number().optional(),
    rangeKm: z.number().optional(),
    engine: z.string().optional(),
    year: z.number().int().optional(),
    country: z.string().optional(),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    youtube: z.object({
      url: z.string().url(),
      title: z.string().optional(),
    }).optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
    })).default([]),
  }),
});

export const collections = { articles, models };

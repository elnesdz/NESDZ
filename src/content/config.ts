import { defineCollection, z } from 'astro:content';
import { ARTICLE_TAGS, MODEL_TAGS } from '../lib/tags';

const slugify = (input: string) =>
  String(input)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Tags canoniques définis dans src/lib/tags.ts
const ARTICLE_TAG_KEYS = new Set(ARTICLE_TAGS.map((tag) => tag.key));
const MODEL_TAG_KEYS = new Set(MODEL_TAGS.map((tag) => tag.key));

// Phase 1 : on autorise aussi les tags legacy déjà publiés,
// pour ne pas casser le build tant que la taxonomie n’a pas été nettoyée.
const LEGACY_TAG_KEYS = new Set([
  'achat',
  'aerodynamique',
  'amphibie',
  'autogire',
  'bas-ailes',
  'brousse',
  'cabine',
  'carbone',
  'club',
  'cockpit-ferme',
  'cockpit-ouvert',
  'composite',
  'confort',
  'culture',
  'decollage-a-pied',
  'ecole',
  'economie',
  'guide',
  'leger',
  'lsa',
  'maintenance',
  'meteo',
  'methode',
  'monoplace',
  'nomade',
  'pendulaire',
  'performant',
  'pilotage',
  'planeur-moteur',
  'polyvalent',
  'prise-de-decision',
  'rapide',
  'robuste',
  'rotor',
  'securite',
  'simplicite',
  'stabilite',
  'stol',
  'surveillance',
  'titane',
  'tout-metal',
  'train-classique',
  'train-tricycle',
  'tube-toile',
  'ultra-leger',
  'vent',
  'voyage',
]);

function tagsSchema(scope: 'article' | 'model', allowedCanonicalKeys: Set<string>) {
  return z.array(z.string()).default([]).superRefine((tags, ctx) => {
    const seen = new Set<string>();

    tags.forEach((rawTag, index) => {
      const normalized = slugify(rawTag);

      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Tag ${scope} vide ou invalide.`,
        });
        return;
      }

      if (seen.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Tag ${scope} en doublon (après normalisation) : "${rawTag}".`,
        });
        return;
      }

      seen.add(normalized);

      const isAllowed =
        allowedCanonicalKeys.has(normalized) || LEGACY_TAG_KEYS.has(normalized);

      if (!isAllowed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Tag ${scope} inconnu : "${rawTag}". Ajoute-le à src/lib/tags.ts ou utilise un tag déjà autorisé.`,
        });
      }
    });
  });
}

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('Rédaction NESDZ'),
    tags: tagsSchema('article', ARTICLE_TAG_KEYS),
    cover: z.string().optional(),
    image: z.string().optional(),
    category: z.string().default('Journal'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

const models = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    manufacturer: z.string().optional(),
    category: z.enum(['Multiaxe', 'Pendulaire', 'Paramoteur', 'Autogire', 'HydroULM', 'Autre']).default('Multiaxe'),
    seats: z.number().int().min(1).max(3).default(2),
    emptyWeightKg: z.number().optional(),
    mtowKg: z.number().optional(),
    cruiseKmh: z.number().optional(),
    stallKmh: z.number().optional(),
    vneKmh: z.number().positive().optional(),
    vsoKmh: z.number().positive().optional(),
    rangeKm: z.number().optional(),
    engine: z.string().optional(),
    year: z.number().int().optional(),
    country: z.string().optional(),
    limitLoadPositiveG: z.number().positive().optional(),
    limitLoadNegativeG: z.number().negative().optional(),
    editorialStatus: z.enum(['en-cours', 'enrichie', 'a-completer']).optional(),
    tags: tagsSchema('model', MODEL_TAG_KEYS),
    heroImage: z.string().optional(),
    youtube: z
      .object({
        url: z.string().url(),
        title: z.string().optional(),
      })
      .optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        })
      )
      .default([]),
  }),
});

export const collections = { articles, models };

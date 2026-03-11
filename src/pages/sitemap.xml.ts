// src/pages/sitemap.xml.ts
import { getCollection } from "astro:content";

export const prerender = true;

// ⚠️ Base URL du site (cohérent avec robots.txt)
const SITE = "https://nesdz.com";

function slugify(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toIso(d: Date) {
  // lastmod doit être en ISO (YYYY-MM-DD ou ISO complet)
  return d.toISOString();
}

function url(loc: string, lastmod?: string) {
  return `
  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

export async function GET() {
  const articles = (await getCollection("articles")).filter((a) => !a.data.draft);
  const models = await getCollection("models");

  // Pages "fixes" (ajoute/enlève selon ton site)
  const staticPaths = [
    "/",
    "/journal/",
    "/modeles/",
    "/edito/",
    "/a-propos/",
    // "/tags/", // décommente seulement si tu as une page /tags/ (index des tags)
  ];

  const urls: { loc: string; lastmod?: string }[] = [];

  // Pages fixes (lastmod optionnel)
  for (const p of staticPaths) {
    urls.push({ loc: `${SITE}${p}` });
  }

  // Articles
  for (const a of articles) {
    const last = (a.data.updated ?? a.data.date) as Date;
    urls.push({
      loc: `${SITE}/journal/${a.slug}/`,
      lastmod: toIso(last),
    });
  }

  // Modèles
  for (const m of models) {
    urls.push({
      loc: `${SITE}/modeles/${m.slug}/`,
    });
  }

  // Tags (union tags articles + modèles)
  const tagSlugs = new Set<string>();

  for (const a of articles) {
    for (const t of a.data.tags ?? []) tagSlugs.add(slugify(t));
  }
  for (const m of models) {
    for (const t of m.data.tags ?? []) tagSlugs.add(slugify(t));
  }

  for (const t of tagSlugs) {
    if (!t) continue;
    urls.push({ loc: `${SITE}/tags/${t}/` });
  }

  const body = urls
    .map((u) => url(u.loc, u.lastmod))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

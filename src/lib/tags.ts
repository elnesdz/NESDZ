export type SiteTag = {
  key: string;
  label: string;
  scope: "article" | "model";
  featured?: boolean;
};

export const ARTICLE_TAGS: SiteTag[] = [
  { key: "pilotage", label: "pilotage", scope: "article", featured: true },
  { key: "navigation", label: "navigation", scope: "article", featured: true },
  { key: "meteo", label: "météo", scope: "article", featured: true },
  { key: "securite", label: "sécurité", scope: "article", featured: true },
  { key: "moteur", label: "moteur", scope: "article", featured: true },
  { key: "rotax", label: "rotax", scope: "article", featured: true },
  { key: "maintenance", label: "maintenance", scope: "article" },
  { key: "aerodynamique", label: "aérodynamique", scope: "article" },
  { key: "radio", label: "radio", scope: "article" },
  { key: "reglementation", label: "réglementation", scope: "article" },
  { key: "formation", label: "formation", scope: "article" },
  { key: "voyage", label: "voyage", scope: "article", featured: true },
  { key: "performance", label: "performance", scope: "article" },
  { key: "carburant", label: "carburant", scope: "article" },
  { key: "avionique", label: "avionique", scope: "article", featured: true },
  { key: "gps", label: "gps", scope: "article" },
  { key: "outils", label: "outils", scope: "article" },
  { key: "comparatif", label: "comparatif", scope: "article", featured: true },
  { key: "essai", label: "essai", scope: "article", featured: true },
  { key: "conseils", label: "conseils", scope: "article" },
  { key: "retour-experience", label: "retour d’expérience", scope: "article" },
  { key: "preparation", label: "préparation", scope: "article" },
  { key: "planification", label: "planification", scope: "article" },
  { key: "cartographie", label: "cartographie", scope: "article" },
  { key: "altitude", label: "altitude", scope: "article" },
  { key: "espaces-aeriens", label: "espaces aériens", scope: "article" },
  { key: "instructeur", label: "instructeur", scope: "article" },
  { key: "technique", label: "technique", scope: "article" },
  { key: "equipement", label: "équipement", scope: "article" },
];

export const MODEL_TAGS: SiteTag[] = [
  { key: "stol", label: "stol", scope: "model" },
  { key: "brousse", label: "brousse", scope: "model" },
  { key: "rapide", label: "rapide", scope: "model" },
  { key: "voyage", label: "voyage", scope: "model" },
  { key: "ecole", label: "école", scope: "model" },
  { key: "sport", label: "sport", scope: "model" },
  { key: "polyvalent", label: "polyvalent", scope: "model" },
  { key: "economique", label: "économique", scope: "model" },
  { key: "composite", label: "composite", scope: "model" },
  { key: "tube-toile", label: "tube-toile", scope: "model" },
  { key: "aluminium", label: "aluminium", scope: "model" },
  { key: "classique", label: "classique", scope: "model" },
];

export const FEATURED_TAG_KEYS = [
  "pilotage",
  "navigation",
  "meteo",
  "securite",
  "moteur",
  "rotax",
  "voyage",
  "avionique",
  "essai",
  "comparatif",
] as const;

export const ALL_TAGS: SiteTag[] = [...ARTICLE_TAGS, ...MODEL_TAGS];

export const TAGS_BY_KEY = new Map(ALL_TAGS.map((tag) => [tag.key, tag]));

export function getTagByKey(key: string) {
  return TAGS_BY_KEY.get(key);
}

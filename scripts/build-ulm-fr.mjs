import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.resolve(__dirname, "../data-source/basulm.kml");
const OUTPUT_FILE = path.resolve(__dirname, "../public/data/ulm-fr.json");

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'");
}

function stripTags(value = "") {
  return String(value).replace(/<[^>]*>/g, " ");
}

function cleanText(value = "") {
  return decodeHtmlEntities(stripTags(value))
    .replace(/\s+/g, " ")
    .trim();
}

function simplify(value = "") {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(regex);
  return match ? cleanText(match[1]) : "";
}

function extractPlacemarkId(openingTag = "") {
  const match = openingTag.match(/\sid="([^"]+)"/i);
  return match ? match[1].trim() : "";
}

function extractCoordinates(block) {
  const raw = extractTag(block, "coordinates");
  if (!raw) {
    return { longitude: null, latitude: null };
  }

  const parts = raw.split(",").map((part) => part.trim());
  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);

  return {
    longitude: Number.isFinite(longitude) ? longitude : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
  };
}

function splitDisplayName(rawName = "", code = "") {
  const prefix = `${code} - `;
  if (rawName.startsWith(prefix)) {
    return rawName.slice(prefix.length).trim();
  }
  return rawName.trim();
}

function detectPlatformType(name = "", description = "") {
  const haystack = simplify(`${name} ${description}`);

  if (haystack.includes("altisurface")) return "altisurface";
  if (haystack.includes("hydrosurface")) return "hydrosurface";
  if (haystack.includes("helistation")) return "helistation";
  if (haystack.includes("base ulm")) return "base_ulm";
  if (haystack.includes("aerodrome")) return "aerodrome";

  return "unknown";
}

function detectAccessTags(name = "", description = "") {
  const haystack = simplify(`${name} ${description}`);
  const tags = [];

  if (
    haystack.includes("acces prive") ||
    haystack.includes("acces privé") ||
    haystack.includes("strictement prive") ||
    haystack.includes("usage strictement prive") ||
    haystack.includes("prive")
  ) {
    tags.push("private");
  }

  if (haystack.includes("autorisation obligatoire")) {
    tags.push("authorization_required");
  }

  if (
    haystack.includes("restreinte") ||
    haystack.includes("restriction") ||
    haystack.includes("restrictions")
  ) {
    tags.push("restricted");
  }

  if (
    haystack.includes("libre d'acces aux ulm") ||
    haystack.includes("libre d acces aux ulm") ||
    haystack.includes("ouvert aux ulm")
  ) {
    tags.push("open_to_ulm");
  }

  if (
    haystack.includes("regles specifiques d'acces") ||
    haystack.includes("regles specifiques")
  ) {
    tags.push("specific_rules");
  }

  if (haystack.includes("en service")) {
    tags.push("in_service");
  }

  return [...new Set(tags)];
}

function detectOperationalLabel(platformType, accessTags) {
  if (platformType === "aerodrome" && accessTags.includes("open_to_ulm")) {
    return "Aérodrome ouvert aux ULM";
  }

  if (platformType === "aerodrome") {
    return "Aérodrome";
  }

  if (platformType === "base_ulm") {
    return "Base ULM";
  }

  if (platformType === "altisurface") {
    return "Altisurface";
  }

  if (platformType === "hydrosurface") {
    return "Hydrosurface";
  }

  if (platformType === "helistation") {
    return "Hélistation";
  }

  return "Plateforme spécifique";
}

function buildWeatherCode(sourceId = "") {
  const code = String(sourceId || "").trim().toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

function parseKml(kmlContent) {
  const placemarkRegex = /<Placemark\b([^>]*)>([\s\S]*?)<\/Placemark>/gi;
  const items = [];

  let match;

  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    const openingTag = match[1] || "";
    const block = match[2] || "";

    const sourceId = extractPlacemarkId(openingTag);
    const rawName = extractTag(block, "name");
    const description = extractTag(block, "description");
    const { longitude, latitude } = extractCoordinates(block);

    if (!sourceId || !rawName || latitude == null || longitude == null) {
      continue;
    }

    const name = splitDisplayName(rawName, sourceId);
    const platformType = detectPlatformType(rawName, description);
    const accessTags = detectAccessTags(rawName, description);
    const weatherCode = buildWeatherCode(sourceId);

    items.push({
      source: "basulm",
      source_id: sourceId,
      code: sourceId,
      raw_name: rawName,
      name,
      description,
      platform_type: platformType,
      operational_label: detectOperationalLabel(platformType, accessTags),
      access_tags: accessTags,
      latitude,
      longitude,
      weather_code: weatherCode,
      weather_capable: Boolean(weatherCode),
      official_check_required: true,
    });
  }

  return items.sort((a, b) => a.code.localeCompare(b.code, "fr"));
}

async function main() {
  const kml = await readFile(INPUT_FILE, "utf8");
  const items = parseKml(kml);

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify(items, null, 2) + "\n",
    "utf8"
  );

  console.log(`Base ULM générée : ${items.length} terrains exportés`);
  console.log(`Fichier écrit : ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Erreur pendant la génération de la base ULM :", error);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const INPUT_PATH = path.resolve("data-source/airports.csv");
const OUTPUT_PATH = path.resolve("public/data/airports-world-lite.json");

const ALLOWED_TYPES = new Set([
  "small_airport",
  "medium_airport",
  "large_airport",
  "seaplane_base",
]);

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function isValidWeatherCode(value) {
  return /^[A-Z]{4}$/.test(normalizeCode(value));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function getTypeScore(type) {
  switch (type) {
    case "large_airport":
      return 400;
    case "medium_airport":
      return 300;
    case "small_airport":
      return 200;
    case "seaplane_base":
      return 100;
    default:
      return 0;
  }
}

function getRecordScore(record) {
  return (
    getTypeScore(record.type) +
    (record.municipality ? 20 : 0) +
    (record.name ? Math.min(record.name.length, 40) : 0)
  );
}

function roundCoord(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(6));
}

async function buildAirportsWorldLite() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Fichier source introuvable : ${INPUT_PATH}`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const stream = fs.createReadStream(INPUT_PATH, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  const byCode = new Map();
  let lineCount = 0;

  for await (const line of rl) {
    lineCount += 1;

    if (!line.trim()) continue;

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const columns = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, columns[index] ?? ""])
    );

    const type = normalizeText(row.type);
    if (!ALLOWED_TYPES.has(type)) continue;

    const latitude = roundCoord(row.latitude_deg);
    const longitude = roundCoord(row.longitude_deg);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const weatherCode =
      [row.icao_code, row.gps_code, row.ident]
        .map(normalizeCode)
        .find(isValidWeatherCode) || "";

    if (!weatherCode) continue;

    const record = {
      icao: weatherCode,
      name: normalizeText(row.name),
      municipality: normalizeText(row.municipality),
      country: normalizeCode(row.iso_country),
      type,
      latitude,
      longitude,
    };

    const current = byCode.get(weatherCode);
    if (!current || getRecordScore(record) > getRecordScore(current)) {
      byCode.set(weatherCode, record);
    }
  }

  const airports = [...byCode.values()].sort((a, b) => {
    const countryDiff = a.country.localeCompare(b.country, "en", {
      sensitivity: "base",
    });
    if (countryDiff !== 0) return countryDiff;

    const cityDiff = a.municipality.localeCompare(b.municipality, "fr", {
      sensitivity: "base",
    });
    if (cityDiff !== 0) return cityDiff;

    const nameDiff = a.name.localeCompare(b.name, "fr", {
      sensitivity: "base",
    });
    if (nameDiff !== 0) return nameDiff;

    return a.icao.localeCompare(b.icao, "en", { sensitivity: "base" });
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(airports));

  console.log(`airports.csv lu : ${lineCount - 1} lignes de données`);
  console.log(
    `airports-world-lite.json généré : ${airports.length} aérodromes exploitables`
  );
  console.log(`Fichier écrit : ${OUTPUT_PATH}`);
}

buildAirportsWorldLite().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

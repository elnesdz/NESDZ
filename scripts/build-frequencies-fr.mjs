import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AIRPORTS_FILE = path.resolve(__dirname, "../data-source/airports.csv");
const FREQUENCIES_FILE = path.resolve(
  __dirname,
  "../data-source/airport-frequencies.csv"
);
const OUTPUT_FILE = path.resolve(__dirname, "../public/data/frequencies-fr.json");

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(content) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function normalizeCode(value = "") {
  return String(value).trim().toUpperCase();
}

function toNumberOrNull(value = "") {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value = "") {
  return String(value).trim();
}

function getWeatherCode(airport) {
  const ident = normalizeCode(airport.ident || "");
  if (/^[A-Z]{4}$/.test(ident)) return ident;

  const gpsCode = normalizeCode(airport.gps_code || "");
  if (/^[A-Z]{4}$/.test(gpsCode)) return gpsCode;

  return "";
}

function isFrenchAirport(airport) {
  return (
    cleanText(airport.iso_country) === "FR" &&
    cleanText(airport.type) !== "closed"
  );
}

function buildAirportIndex(airportsRows) {
  const index = new Map();

  airportsRows
    .filter(isFrenchAirport)
    .forEach((airport) => {
      const ident = normalizeCode(airport.ident || "");
      if (!ident) return;

      index.set(ident, {
        ident,
        icao: normalizeCode(airport.ident || ""),
        gps_code: normalizeCode(airport.gps_code || ""),
        weather_code: getWeatherCode(airport) || null,
        name: cleanText(airport.name || ""),
        type: cleanText(airport.type || ""),
        municipality: cleanText(airport.municipality || ""),
        region: cleanText(airport.iso_region || ""),
      });
    });

  return index;
}

function normalizeFrequencyType(type = "", description = "") {
  const value = normalizeCode(`${type} ${description}`);

  if (value.includes("TWR")) return "tower";
  if (value.includes("GROUND")) return "ground";
  if (value.includes("GND")) return "ground";
  if (value.includes("AFIS")) return "afis";
  if (value.includes("APP")) return "approach";
  if (value.includes("APPROACH")) return "approach";
  if (value.includes("DEP")) return "departure";
  if (value.includes("DEPARTURE")) return "departure";
  if (value.includes("ATIS")) return "atis";
  if (value.includes("CTAF")) return "ctaf";
  if (value.includes("UNICOM")) return "unicom";
  if (value.includes("RADIO")) return "radio";
  if (value.includes("INFO")) return "information";

  return "other";
}

function buildFrequencyLabel(type = "", description = "") {
  const cleanDescription = cleanText(description);
  const cleanType = cleanText(type);

  if (cleanDescription) return cleanDescription;
  if (cleanType) return cleanType;
  return "Fréquence";
}

function mainFrequencySortScore(item) {
  const order = {
    tower: 0,
    afis: 1,
    radio: 2,
    information: 3,
    ctaf: 4,
    unicom: 5,
    approach: 6,
    departure: 7,
    ground: 8,
    atis: 9,
    other: 10,
  };

  return order[item.frequency_type] ?? 99;
}

async function main() {
  const [airportsCsv, frequenciesCsv] = await Promise.all([
    readFile(AIRPORTS_FILE, "utf8"),
    readFile(FREQUENCIES_FILE, "utf8"),
  ]);

  const airportsRows = parseCsv(airportsCsv);
  const frequenciesRows = parseCsv(frequenciesCsv);

  const airportIndex = buildAirportIndex(airportsRows);
  const grouped = new Map();

  frequenciesRows.forEach((row) => {
    const airportIdent = normalizeCode(row.airport_ident || "");
    if (!airportIdent) return;

    const airport = airportIndex.get(airportIdent);
    if (!airport) return;

    const frequencyMhz = toNumberOrNull(row.frequency_mhz || "");
    if (frequencyMhz == null) return;

    const entry = {
      airport_ident: airport.ident,
      weather_code: airport.weather_code,
      airport_name: airport.name,
      airport_type: airport.type,
      municipality: airport.municipality,
      region: airport.region,
      frequency_type: normalizeFrequencyType(row.type || "", row.description || ""),
      label: buildFrequencyLabel(row.type || "", row.description || ""),
      description: cleanText(row.description || ""),
      frequency_mhz: frequencyMhz,
    };

    if (!grouped.has(airport.ident)) {
      grouped.set(airport.ident, {
        airport_ident: airport.ident,
        weather_code: airport.weather_code,
        airport_name: airport.name,
        airport_type: airport.type,
        municipality: airport.municipality,
        region: airport.region,
        frequencies: [],
      });
    }

    grouped.get(airport.ident).frequencies.push(entry);
  });

  const result = Array.from(grouped.values())
    .map((airport) => {
      const frequencies = airport.frequencies
        .sort((a, b) => {
          const scoreDiff = mainFrequencySortScore(a) - mainFrequencySortScore(b);
          if (scoreDiff !== 0) return scoreDiff;
          return a.frequency_mhz - b.frequency_mhz;
        });

      return {
        ...airport,
        frequencies,
        primary_frequency: frequencies[0] ?? null,
      };
    })
    .sort((a, b) =>
      a.airport_ident.localeCompare(b.airport_ident, "fr", {
        sensitivity: "base",
      })
    );

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`Base fréquences France générée : ${result.length} terrains exportés`);
  console.log(`Fichier écrit : ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Erreur pendant la génération des fréquences France :", error);
  process.exit(1);
});

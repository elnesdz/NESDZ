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

/**
 * Source mondiale conservée.
 * Première sortie utile pour NESDZ : France.
 * Plus tard, on pourra factoriser ce script pour d'autres pays / zones.
 */
const COUNTRY_CODE = "FR";

function parseCsvLine(line) {
  const values = [];
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
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const rawValues = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = rawValues[index] ?? "";
    });

    return row;
  });
}

function cleanText(value = "") {
  return String(value).trim();
}

function normalizeCode(value = "") {
  return cleanText(value).toUpperCase();
}

function toNumberOrNull(value = "") {
  const parsed = Number(cleanText(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlausibleFrequencyMhz(value) {
  return Number.isFinite(value) && value >= 100 && value <= 500;
}

function getWeatherCode(airport) {
  const ident = normalizeCode(airport.ident);
  if (/^[A-Z]{4}$/.test(ident)) return ident;

  const gpsCode = normalizeCode(airport.gps_code);
  if (/^[A-Z]{4}$/.test(gpsCode)) return gpsCode;

  return null;
}

function isAirportInTargetCountry(airport) {
  return cleanText(airport.iso_country) === COUNTRY_CODE;
}

function isAirportUsable(airport) {
  return cleanText(airport.type) !== "closed";
}

function buildAirportIndex(airportsRows) {
  const index = new Map();

  airportsRows
    .filter(isAirportInTargetCountry)
    .filter(isAirportUsable)
    .forEach((airport) => {
      const ident = normalizeCode(airport.ident);
      if (!ident) return;

      index.set(ident, {
        ident,
        weather_code: getWeatherCode(airport),
        airport_name: cleanText(airport.name),
        airport_type: cleanText(airport.type),
        municipality: cleanText(airport.municipality),
        region: cleanText(airport.iso_region),
        gps_code: normalizeCode(airport.gps_code),
        icao: normalizeCode(airport.ident),
      });
    });

  return index;
}

function normalizeFrequencyType(type = "", description = "") {
  const value = normalizeCode(`${type} ${description}`);

  if (value.includes("TWR") || value.includes("TOWER")) return "tower";
  if (value.includes("AFIS")) return "afis";
  if (value.includes("ATIS")) return "atis";
  if (value.includes("GROUND") || value.includes("GND")) return "ground";
  if (value.includes("APP") || value.includes("APPROACH")) return "approach";
  if (value.includes("DEP") || value.includes("DEPARTURE")) return "departure";
  if (value.includes("CTAF")) return "ctaf";
  if (value.includes("UNICOM")) return "unicom";
  if (value.includes("INFO")) return "information";
  if (value.includes("RADIO")) return "radio";

  return "other";
}

function buildFrequencyLabel(type = "", description = "") {
  const cleanDescription = cleanText(description);
  const cleanType = cleanText(type);

  if (cleanDescription) return cleanDescription;
  if (cleanType) return cleanType;
  return "Fréquence";
}

function frequencyPriority(entry) {
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

  return order[entry.frequency_type] ?? 99;
}

function dedupeFrequencies(list) {
  const seen = new Set();

  return list.filter((item) => {
    const key = `${item.frequency_type}|${item.label}|${item.frequency_mhz}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  for (const row of frequenciesRows) {
    const airportIdent = normalizeCode(row.airport_ident);
    if (!airportIdent) continue;

    const airport = airportIndex.get(airportIdent);
    if (!airport) continue;

    const frequencyMhz = toNumberOrNull(row.frequency_mhz);
    if (!isPlausibleFrequencyMhz(frequencyMhz)) continue;

    const frequency = {
      airport_ident: airport.ident,
      weather_code: airport.weather_code,
      airport_name: airport.airport_name,
      airport_type: airport.airport_type,
      municipality: airport.municipality,
      region: airport.region,
      frequency_type: normalizeFrequencyType(row.type, row.description),
      label: buildFrequencyLabel(row.type, row.description),
      description: cleanText(row.description),
      frequency_mhz: frequencyMhz,
    };

    if (!grouped.has(airport.ident)) {
      grouped.set(airport.ident, {
        airport_ident: airport.ident,
        weather_code: airport.weather_code,
        airport_name: airport.airport_name,
        airport_type: airport.airport_type,
        municipality: airport.municipality,
        region: airport.region,
        frequencies: [],
      });
    }

    grouped.get(airport.ident).frequencies.push(frequency);
  }

  const result = Array.from(grouped.values())
    .map((airport) => {
      const frequencies = dedupeFrequencies(airport.frequencies).sort((a, b) => {
        const typeDiff = frequencyPriority(a) - frequencyPriority(b);
        if (typeDiff !== 0) return typeDiff;
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

  console.log(
    `Base fréquences ${COUNTRY_CODE} générée : ${result.length} terrains exportés`
  );
  console.log(`Fichier écrit : ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Erreur pendant la génération des fréquences :", error);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, "data-source");
const OUTPUT_DIR = path.join(ROOT, "public", "data");

const AIRPORTS_CSV = path.join(INPUT_DIR, "airports.csv");
const RUNWAYS_CSV = path.join(INPUT_DIR, "runways.csv");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "airports-fr-full.json");

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

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function toNumber(value) {
  if (value === "" || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toBool(value) {
  return value === "yes" || value === "true" || value === "1";
}

function cleanText(value) {
  if (!value) return "";
  return String(value).trim();
}

function main() {
  if (!fs.existsSync(AIRPORTS_CSV)) {
    throw new Error(
      `Fichier introuvable : ${AIRPORTS_CSV}\nPlace airports.csv dans data-source/`
    );
  }

  if (!fs.existsSync(RUNWAYS_CSV)) {
    throw new Error(
      `Fichier introuvable : ${RUNWAYS_CSV}\nPlace runways.csv dans data-source/`
    );
  }

  const airports = readCsv(AIRPORTS_CSV);
  const runways = readCsv(RUNWAYS_CSV);

  const runwaysByAirport = new Map();

  for (const runway of runways) {
    const airportRef = cleanText(runway.airport_ref);
    if (!airportRef) continue;

    const runwayEntry = {
      id: cleanText(runway.id),
      length_ft: toNumber(runway.length_ft),
      width_ft: toNumber(runway.width_ft),
      surface: cleanText(runway.surface),
      lighted: toBool(runway.lighted),
      closed: toBool(runway.closed),
      le_ident: cleanText(runway.le_ident),
      le_heading_degT: toNumber(runway.le_heading_degT),
      he_ident: cleanText(runway.he_ident),
      he_heading_degT: toNumber(runway.he_heading_degT),
    };

    if (!runwaysByAirport.has(airportRef)) {
      runwaysByAirport.set(airportRef, []);
    }

    runwaysByAirport.get(airportRef).push(runwayEntry);
  }

  const france = airports
    .filter((airport) => cleanText(airport.iso_country) === "FR")
    .map((airport) => {
      const airportId = cleanText(airport.id);
      const icao = cleanText(airport.ident);
      const type = cleanText(airport.type);

      return {
        id: airportId,
        icao,
        name: cleanText(airport.name),
        type,
        latitude: toNumber(airport.latitude_deg),
        longitude: toNumber(airport.longitude_deg),
        elevation_ft: toNumber(airport.elevation_ft),
        municipality: cleanText(airport.municipality),
        region: cleanText(airport.iso_region),
        scheduled_service: cleanText(airport.scheduled_service),
        gps_code: cleanText(airport.gps_code),
        iata_code: cleanText(airport.iata_code),
        home_link: cleanText(airport.home_link),
        wikipedia_link: cleanText(airport.wikipedia_link),
        keywords: cleanText(airport.keywords),
        is_ulm_candidate:
          type === "small_airport" || type === "heliport" || type === "closed",
        runways: runwaysByAirport.get(airportId) ?? [],
      };
    })
    .filter((airport) => airport.latitude != null && airport.longitude != null)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(france, null, 2), "utf8");

  console.log(`Base France générée : ${OUTPUT_JSON}`);
  console.log(`Terrains exportés : ${france.length}`);
}

main();

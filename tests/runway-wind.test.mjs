import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculateWindComponents,
  chooseBestRunwayAxis,
} from "../src/lib/runway-wind.mjs";

const toolsPageUrl = new URL("../src/pages/outils/index.astro", import.meta.url);
const airportsUrl = new URL("../public/data/airports-fr-full.json", import.meta.url);

test("calculates headwind and crosswind for the selected runway axis", () => {
  const result = calculateWindComponents({
    windDirectionDeg: 230,
    windSpeedKt: 7,
    runwayHeadingDeg: 260,
  });

  assert.ok(result);
  assert.equal(Math.round(result.headwindKt), 6);
  assert.ok(Math.abs(result.crosswindKt - 3.5) < 0.001);
  assert.equal(result.crosswindSide, "left");
  assert.equal(Math.round(result.angleDeg), 30);
});

test("identifies tailwind on the reciprocal axis", () => {
  const result = calculateWindComponents({
    windDirectionDeg: 230,
    windSpeedKt: 7,
    runwayHeadingDeg: 80,
  });

  assert.ok(result);
  assert.equal(Math.round(result.headwindKt), -6);
  assert.ok(Math.abs(result.crosswindKt - 3.5) < 0.001);
});

test("suggests the axis with the greatest headwind component", () => {
  const axes = [
    { key: "08", headingDeg: 80 },
    { key: "26", headingDeg: 260 },
  ];
  const best = chooseBestRunwayAxis(axes, 230, 7);

  assert.equal(best?.axis.key, "26");
});

test("published airport data retains true runway headings", async () => {
  const airports = JSON.parse(await readFile(airportsUrl, "utf8"));
  const lille = airports.find((airport) => airport.icao === "LFQQ");

  assert.ok(lille);
  assert.ok(
    lille.runways.some(
      (runway) =>
        Number.isFinite(runway.le_heading_degT) &&
        Number.isFinite(runway.he_heading_degT)
    )
  );
});

test("briefing exposes an accessible manual runway selector", async () => {
  const source = await readFile(toolsPageUrl, "utf8");

  assert.match(source, /Choisir l’axe à analyser/);
  assert.match(source, /data-runway-axis-key/);
  assert.match(source, /aria-pressed=/);
  assert.doesNotMatch(source, /RUNWAY_WIND_ANALYSIS_ENABLED/);
  assert.doesNotMatch(source, /crosswind\s*>=\s*12/);
  assert.match(source, /ne désigne jamais la piste en service/);
});

test("French airports prefer the detailed France dataset before world fallback", async () => {
  const source = await readFile(toolsPageUrl, "utf8");
  const localLookup = source.match(
    /async function findAirportByCode[\s\S]*?async function findWorldAirportByCode/
  )?.[0] || "";

  assert.match(localLookup, /await loadAirports\(\)/);
  assert.doesNotMatch(localLookup, /await loadWorldAirports\(\)/);
  assert.match(
    source,
    /const localAirport = await findAirportByCode\(code\);[\s\S]*?if \(localAirport\) return localAirport;[\s\S]*?return findWorldAirportByCode\(code\);/
  );
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { formatAwcVisibility } from "../src/lib/aviation-weather.mjs";

test("formats numeric AWC visibility in statute miles and kilometres", () => {
  assert.equal(formatAwcVisibility(3), "3 SM (~4,8 km)");
  assert.equal(formatAwcVisibility("10"), "10 SM (~16 km)");
});

test("formats AWC greater-than visibility without losing the source unit", () => {
  assert.equal(formatAwcVisibility("6+"), "Plus de 6 SM (≥ 9,7 km)");
  assert.equal(formatAwcVisibility("P6"), "Plus de 6 SM (≥ 9,7 km)");
});

test("formats fractional and less-than AWC visibility", () => {
  assert.equal(formatAwcVisibility("1 1/2"), "1 1/2 SM (~2,4 km)");
  assert.equal(formatAwcVisibility("M1/4"), "Moins de 1/4 SM (< 0,4 km)");
});

test("keeps unknown values explicit instead of inventing kilometres", () => {
  assert.equal(formatAwcVisibility(null), "—");
  assert.equal(formatAwcVisibility("UNKNOWN"), "UNKNOWN SM");
});

test("published merged radio frequencies stay in a plausible MHz range", async () => {
  const fileUrl = new URL("../public/data/frequencies-fr-merged.json", import.meta.url);
  const airports = JSON.parse(await readFile(fileUrl, "utf8"));

  for (const airport of airports) {
    for (const frequency of airport.frequencies || []) {
      assert.ok(
        Number(frequency.frequency_mhz) >= 100 &&
          Number(frequency.frequency_mhz) <= 500,
        `${airport.airport_ident}: ${frequency.frequency_mhz} MHz`
      );
    }
  }
});

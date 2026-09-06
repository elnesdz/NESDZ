import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { CURATED_QUESTIONS } from "../src/data/coach-questions.mjs";
import {
  ALGORITHMIC_VARIANTS,
  EXAM_RULES,
  THEMES,
  createRng,
  createSession,
  flightTimeMinutes,
  generateAlgorithmicQuestion,
  magneticFromTrue,
  mapDistanceKm,
  nauticalMilesToKm,
  plannedFuelLitres,
  windComponents,
} from "../src/lib/coach-engine.mjs";

test("the curated ULM bank covers every displayed theme", () => {
  assert.equal(THEMES.length, 8);
  assert.equal(CURATED_QUESTIONS.length, 40);
  for (const theme of THEMES) {
    assert.equal(
      CURATED_QUESTIONS.filter((question) => question.theme === theme.id).length,
      5,
      `${theme.label} should contain five reviewed starter questions`,
    );
  }
});

test("every curated question is a defensible four-option single answer item", () => {
  const identifiers = new Set();
  for (const question of CURATED_QUESTIONS) {
    assert.ok(!identifiers.has(question.id), `duplicate id: ${question.id}`);
    identifiers.add(question.id);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4, question.id);
    assert.ok(question.explanation.length >= 40, question.id);
    assert.ok(question.hint.length >= 20, question.id);
    assert.match(question.source.url, /^https:\/\//, question.id);
  }
});

test("official exam settings remain explicit", () => {
  assert.deepEqual(EXAM_RULES, {
    questionCount: 60,
    durationMinutes: 90,
    passingPercent: 75,
  });
  assert.ok(ALGORITHMIC_VARIANTS >= 1500);
});

test("wind components are calculated against the selected axis", () => {
  const directHeadwind = windComponents(260, 260, 20);
  assert.ok(Math.abs(directHeadwind.headwindKt - 20) < 1e-9);
  assert.ok(Math.abs(directHeadwind.crosswindKt) < 1e-9);

  const rightCrosswind = windComponents(0, 90, 20);
  assert.ok(Math.abs(rightCrosswind.headwindKt) < 1e-9);
  assert.ok(Math.abs(rightCrosswind.crosswindKt - 20) < 1e-9);
});

test("navigation and planning formulas return independently checkable results", () => {
  assert.equal(mapDistanceKm(4, 250000), 10);
  assert.equal(flightTimeMinutes(60, 120), 30);
  assert.equal(plannedFuelLitres(12, 60, 30), 18);
  assert.equal(magneticFromTrue(90, 4, "E"), 86);
  assert.equal(magneticFromTrue(90, 4, "W"), 94);
  assert.equal(nauticalMilesToKm(10), 18.52);
});

test("algorithmic questions always contain one usable answer among four unique options", () => {
  const rng = createRng(20260906);
  for (let index = 0; index < 500; index += 1) {
    const question = generateAlgorithmicQuestion(rng);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.ok(question.correct >= 0 && question.correct < 4, question.id);
    assert.ok(question.options[question.correct], question.id);
    assert.equal(question.generated, true);
  }
});

test("exam and navigation sessions contain the expected number of unique questions", () => {
  const exam = createSession({ mode: "exam", seed: 42 });
  const navigation = createSession({ mode: "navigation", seed: 42 });
  assert.equal(exam.length, 60);
  assert.equal(new Set(exam.map((question) => question.id)).size, 60);
  assert.equal(navigation.length, 12);
  assert.equal(new Set(navigation.map((question) => question.id)).size, 12);
});

test("coach page exposes accessible training controls and an honest disclaimer", () => {
  const page = fs.readFileSync(new URL("../src/pages/coach/index.astro", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
  const layout = fs.readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(page, /Outil d’entraînement indépendant/);
  assert.match(page, /ni la banque réelle de la DGAC/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /localStorage/);
  assert.match(page, /data-start="exam"/);
  assert.match(page, /data-start="navigation"/);
  assert.match(home, /href="\/coach\/"/);
  assert.match(layout, />Coach théorique</);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  COACH_BANK_REVIEWED_AT,
  COACH_BANK_VERSION,
  CURATED_QUESTIONS,
} from "../src/data/coach-questions.mjs";
import {
  ALGORITHMIC_VARIANTS,
  COACH_QUALITY,
  EXAM_BLUEPRINT,
  EXAM_RULES,
  THEMES,
  createRng,
  createSession,
  flightTimeMinutes,
  generateAlgorithmicQuestion,
  generateWindTriangleQuestion,
  magneticFromTrue,
  mapDistanceKm,
  nauticalMilesToKm,
  plannedFuelLitres,
  solveWindTriangle,
  windComponents,
} from "../src/lib/coach-engine.mjs";

test("the curated ULM bank covers every displayed theme", () => {
  assert.equal(THEMES.length, 8);
  assert.equal(CURATED_QUESTIONS.length, 64);
  for (const theme of THEMES) {
    assert.equal(
      CURATED_QUESTIONS.filter((question) => question.theme === theme.id).length,
      8,
      `${theme.label} should contain eight reviewed questions`,
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
    assert.equal(question.feedback.length, 4, question.id);
    assert.ok(question.feedback.every((feedback) => feedback.length >= 40), question.id);
    assert.match(question.source.url, /^https:\/\//, question.id);
    assert.equal(question.editorial.bankVersion, COACH_BANK_VERSION, question.id);
    assert.equal(question.editorial.reviewedAt, COACH_BANK_REVIEWED_AT, question.id);
    assert.match(question.editorial.syllabusReference, /^Annexe I/, question.id);
  }
});

test("official exam settings remain explicit", () => {
  assert.deepEqual(EXAM_RULES, {
    questionCount: 60,
    durationMinutes: 90,
    passingPercent: 75,
  });
  assert.ok(ALGORITHMIC_VARIANTS >= 1500);
  assert.equal(Object.values(EXAM_BLUEPRINT).reduce((total, value) => total + value, 0), 60);
  assert.match(COACH_QUALITY.status, /non agréé DGAC/);
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

test("the full wind triangle solves heading and groundspeed with aviation conventions", () => {
  const crosswind = solveWindTriangle(0, 100, 90, 20);
  assert.ok(Math.abs(crosswind.headingDeg - 11.536959) < 0.0001);
  assert.ok(Math.abs(crosswind.groundspeedKt - 97.97959) < 0.0001);
  assert.ok(Math.abs(crosswind.correctionDeg - 11.536959) < 0.0001);

  const headwind = solveWindTriangle(0, 100, 0, 20);
  assert.ok(Math.abs(headwind.headingDeg) < 1e-9);
  assert.ok(Math.abs(headwind.groundspeedKt - 80) < 1e-9);
});

test("wind-triangle questions expose a complete but internally consistent solution", () => {
  const question = generateWindTriangleQuestion(createRng(260090));
  assert.equal(question.visual.type, "wind-triangle");
  assert.equal(question.options.length, 4);
  assert.equal(question.feedback.length, 4);
  assert.match(question.explanation, /correction de dérive/);
  assert.equal(question.options[question.correct], `${String(question.visual.heading).padStart(3, "0")}°`);
});

test("algorithmic questions always contain one usable answer and four feedback messages", () => {
  const rng = createRng(20260906);
  for (let index = 0; index < 1000; index += 1) {
    const question = generateAlgorithmicQuestion(rng);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.ok(question.correct >= 0 && question.correct < 4, question.id);
    assert.ok(question.options[question.correct], question.id);
    assert.equal(question.feedback.length, 4, question.id);
    assert.ok(question.feedback.every(Boolean), question.id);
    assert.equal(question.editorial.status, "calcul-verifie", question.id);
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
  assert.ok(exam.every((question) => question.feedback[question.correct] === question.explanation));
  for (const [theme, expected] of Object.entries(EXAM_BLUEPRINT)) {
    assert.equal(exam.filter((question) => question.theme === theme).length, expected, theme);
  }
  assert.ok(exam.filter((question) => question.generated).length >= 7);
});

test("coach page exposes accessible training controls and an honest disclaimer", () => {
  const page = fs.readFileSync(new URL("../src/pages/coach/index.astro", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
  const layout = fs.readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const quality = fs.readFileSync(new URL("../docs/REFERENTIEL_QUALITE_COACH_ULM.md", import.meta.url), "utf8");

  assert.match(page, /Outil d’entraînement indépendant/);
  assert.match(page, /ni la banque réelle de la DGAC/);
  assert.match(page, /NON AGRÉÉ DGAC/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /localStorage/);
  assert.match(page, /data-start="exam"/);
  assert.match(page, /data-start="navigation"/);
  assert.match(page, /id="exam-navigator"/);
  assert.match(page, /id="flag-question"/);
  assert.match(page, /VOTRE RÉPONSE/);
  assert.match(page, /RÉPONSE ATTENDUE/);
  assert.match(page, /MÉTHODE ET RAISONNEMENT/);
  assert.match(page, /id="print-results"/);
  assert.match(page, /<style is:global>/);
  assert.match(home, /href="\/coach\/"/);
  assert.match(layout, />Coach théorique</);
  assert.match(quality, /non agréé et non homologué par la DGAC/);
  assert.match(quality, /étude psychométrique/);
});

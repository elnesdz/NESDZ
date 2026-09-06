import { COACH_SOURCES, CURATED_QUESTIONS } from "../data/coach-questions.mjs";

export const THEMES = [
  { id: "aeronef", label: "Connaissance aéronef", short: "Aéronef", icon: "ENGINE", color: "cyan" },
  { id: "aerodynamique", label: "Principes du vol", short: "Aérodynamique", icon: "LIFT", color: "violet" },
  { id: "meteo", label: "Météorologie", short: "Météo", icon: "MET", color: "blue" },
  { id: "reglementation", label: "Réglementation", short: "Réglementation", icon: "SERA", color: "amber" },
  { id: "navigation", label: "Navigation", short: "Navigation", icon: "NAV", color: "green" },
  { id: "facteurs-humains", label: "Facteurs humains", short: "Facteurs humains", icon: "HUM", color: "pink" },
  { id: "performances", label: "Performances et préparation", short: "Performances", icon: "PERF", color: "orange" },
  { id: "operations", label: "Procédures opérationnelles", short: "Procédures", icon: "OPS", color: "red" },
];

export const EXAM_RULES = {
  questionCount: 60,
  durationMinutes: 90,
  passingPercent: 75,
};

export const ALGORITHMIC_VARIANTS = 8000;

export function normalizeHeading(value) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function formatHeading(value) {
  return String(normalizeHeading(value)).padStart(3, "0") + "°";
}

export function windComponents(courseDeg, windFromDeg, windSpeedKt) {
  const relative = ((((windFromDeg - courseDeg) % 360) + 540) % 360) - 180;
  const radians = (relative * Math.PI) / 180;
  return {
    relativeDeg: relative,
    headwindKt: windSpeedKt * Math.cos(radians),
    crosswindKt: windSpeedKt * Math.sin(radians),
  };
}

export function magneticFromTrue(trueDeg, variationDeg, direction) {
  const signedVariation = direction === "E" ? variationDeg : -variationDeg;
  return normalizeHeading(trueDeg - signedVariation);
}

export function mapDistanceKm(centimetres, scaleDenominator) {
  return (centimetres * scaleDenominator) / 100000;
}

export function flightTimeMinutes(distanceNm, groundspeedKt) {
  return (distanceNm / groundspeedKt) * 60;
}

export function plannedFuelLitres(consumptionLph, flightMinutes, reserveMinutes) {
  return (consumptionLph * (flightMinutes + reserveMinutes)) / 60;
}

export function nauticalMilesToKm(distanceNm) {
  return distanceNm * 1.852;
}

export function createRng(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(values, rng) {
  return values[Math.floor(rng() * values.length)];
}

function shuffle(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function uniqueNumericOptions(answer, candidates, formatter, rng) {
  const values = [answer, ...candidates].filter(
    (value, index, list) => Number.isFinite(value) && list.findIndex((other) => Math.abs(other - value) < 0.001) === index,
  );
  let offset = 1;
  while (values.length < 4) {
    const next = Math.max(0, answer + offset);
    if (!values.some((value) => Math.abs(value - next) < 0.001)) values.push(next);
    offset += 1;
  }
  const labelled = shuffle(values.slice(0, 4), rng).map((value) => ({ value, label: formatter(value) }));
  return {
    options: labelled.map((item) => item.label),
    correct: labelled.findIndex((item) => Math.abs(item.value - answer) < 0.001),
  };
}

function generatedQuestion(base) {
  return {
    ...base,
    id: `generated-${base.kind}-${base.seedPart}`,
    theme: base.theme ?? "navigation",
    difficulty: base.difficulty ?? 2,
    source: COACH_SOURCES.programme,
    generated: true,
  };
}

function generateWindQuestion(rng) {
  const course = pick(Array.from({ length: 36 }, (_, index) => index * 10), rng);
  const angle = pick([20, 30, 40, 50, 60, 70, 80, 90], rng);
  const side = pick([-1, 1], rng);
  const windSpeed = pick([8, 10, 12, 15, 18, 20, 25], rng);
  const windFrom = normalizeHeading(course + side * angle);
  const components = windComponents(course, windFrom, windSpeed);
  const askCrosswind = rng() > 0.45;
  const answer = Math.round(Math.abs(askCrosswind ? components.crosswindKt : components.headwindKt));
  const otherComponent = Math.round(Math.abs(askCrosswind ? components.headwindKt : components.crosswindKt));
  const choice = uniqueNumericOptions(
    answer,
    [otherComponent, windSpeed, Math.max(0, answer - 3), answer + 3],
    (value) => `${Math.round(value)} kt`,
    rng,
  );
  const sideLabel = components.crosswindKt > 0 ? "de droite" : "de gauche";
  return generatedQuestion({
    kind: askCrosswind ? "crosswind" : "headwind",
    seedPart: `${course}-${windFrom}-${windSpeed}-${askCrosswind ? "x" : "h"}`,
    prompt: `Vous suivez l’axe ${formatHeading(course)}. Le vent vient du ${formatHeading(windFrom)} pour ${windSpeed} kt. Quelle est approximativement la composante ${askCrosswind ? "traversière" : "de face"} ?`,
    options: choice.options,
    correct: choice.correct,
    explanation: `Écart angulaire : ${Math.abs(components.relativeDeg)}°. Composante de face = V × cos(écart), composante traversière = V × sin(écart). On obtient environ ${Math.round(Math.abs(components.headwindKt))} kt de face et ${Math.round(Math.abs(components.crosswindKt))} kt traversiers ${sideLabel}.`,
    hint: `Décomposez le vent avec le cosinus pour la composante axiale et le sinus pour la composante traversière.`,
    visual: { type: "wind", course, windFrom, windSpeed, side: sideLabel },
  });
}

function generateScaleQuestion(rng) {
  const scale = pick([250000, 500000, 1000000], rng);
  const centimetres = pick([2, 3, 4, 5, 6, 7, 8, 9, 10], rng);
  const answer = mapDistanceKm(centimetres, scale);
  const choice = uniqueNumericOptions(
    answer,
    [answer / 2, answer * 2, centimetres * (scale / 1000000), answer + 5],
    (value) => `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} km`,
    rng,
  );
  return generatedQuestion({
    kind: "scale",
    seedPart: `${scale}-${centimetres}`,
    difficulty: 1,
    prompt: `Sur une carte au 1/${scale.toLocaleString("fr-FR")}, vous mesurez ${centimetres} cm entre deux points. Quelle distance réelle cela représente-t-il ?`,
    options: choice.options,
    correct: choice.correct,
    explanation: `${centimetres} cm × ${scale.toLocaleString("fr-FR")} = ${(centimetres * scale).toLocaleString("fr-FR")} cm, soit ${Number.isInteger(answer) ? answer : answer.toFixed(1).replace(".", ",")} km.`,
    hint: "Multipliez la mesure par le dénominateur, puis convertissez les centimètres en kilomètres.",
    visual: { type: "scale", scale, centimetres },
  });
}

function generateTimeQuestion(rng) {
  const groundspeed = pick([60, 75, 90, 100, 120, 150], rng);
  const expectedMinutes = pick([20, 24, 30, 36, 40, 45, 48, 60], rng);
  const distance = Math.round((groundspeed * expectedMinutes) / 60);
  const answer = Math.round(flightTimeMinutes(distance, groundspeed));
  const choice = uniqueNumericOptions(
    answer,
    [Math.round((distance / 60) * groundspeed), Math.round(answer * 0.8), answer + 10, Math.max(1, answer - 10)],
    (value) => `${Math.round(value)} min`,
    rng,
  );
  return generatedQuestion({
    kind: "time",
    seedPart: `${distance}-${groundspeed}`,
    prompt: `Une branche mesure ${distance} NM. Votre vitesse sol prévue est de ${groundspeed} kt. Quel temps de vol faut-il prévoir, à la minute près ?`,
    options: choice.options,
    correct: choice.correct,
    explanation: `Temps = distance / vitesse × 60 = ${distance} / ${groundspeed} × 60 ≈ ${answer} minutes.`,
    hint: "Une vitesse en nœuds exprime des milles nautiques parcourus en une heure.",
    visual: { type: "route", distance, groundspeed },
  });
}

function generateFuelQuestion(rng) {
  const consumption = pick([8, 10, 12, 14, 16, 18], rng);
  const flightMinutes = pick([45, 60, 75, 90, 105, 120], rng);
  const reserveMinutes = pick([30, 45], rng);
  const answer = Math.round(plannedFuelLitres(consumption, flightMinutes, reserveMinutes) * 10) / 10;
  const flightOnly = Math.round(plannedFuelLitres(consumption, flightMinutes, 0) * 10) / 10;
  const choice = uniqueNumericOptions(
    answer,
    [flightOnly, answer + consumption / 2, Math.max(0, answer - consumption / 2), consumption * ((flightMinutes + reserveMinutes) / 100)],
    (value) => `${value.toFixed(1).replace(".", ",")} L`,
    rng,
  );
  return generatedQuestion({
    kind: "fuel",
    seedPart: `${consumption}-${flightMinutes}-${reserveMinutes}`,
    theme: "performances",
    prompt: `Votre ULM consomme ${consumption} L/h. Le vol prévu dure ${flightMinutes} min et vous ajoutez une réserve planifiée de ${reserveMinutes} min. Quel volume total faut-il prévoir, hors marge supplémentaire, au dixième de litre ?`,
    options: choice.options,
    correct: choice.correct,
    explanation: `Durée prise en compte : ${flightMinutes} + ${reserveMinutes} = ${flightMinutes + reserveMinutes} min. Carburant = ${consumption} × ${flightMinutes + reserveMinutes} / 60 = ${answer.toFixed(1).replace(".", ",")} L.`,
    hint: "Additionnez d’abord le temps de vol et la réserve, puis convertissez les minutes en heures.",
    visual: { type: "fuel", consumption, flightMinutes, reserveMinutes },
  });
}

function generateMagneticQuestion(rng) {
  const trueRoute = pick(Array.from({ length: 36 }, (_, index) => index * 10), rng);
  const variation = pick([2, 3, 4, 5, 6, 7, 8], rng);
  const direction = pick(["E", "W"], rng);
  const answer = magneticFromTrue(trueRoute, variation, direction);
  const opposite = magneticFromTrue(trueRoute, variation, direction === "E" ? "W" : "E");
  const values = shuffle(
    Array.from(new Set([answer, opposite, normalizeHeading(trueRoute), normalizeHeading(answer + 10), normalizeHeading(answer - 10)])).slice(0, 4),
    rng,
  );
  return generatedQuestion({
    kind: "magnetic",
    seedPart: `${trueRoute}-${variation}-${direction}`,
    prompt: `La route vraie est ${formatHeading(trueRoute)} et la déclinaison magnétique locale vaut ${variation}° ${direction === "E" ? "Est" : "Ouest"}. Quelle route magnétique en déduisez-vous ?`,
    options: values.map(formatHeading),
    correct: values.indexOf(answer),
    explanation: `Route magnétique = route vraie ${direction === "E" ? "−" : "+"} déclinaison ${direction === "E" ? "Est" : "Ouest"}. Le résultat est ${formatHeading(answer)}.`,
    hint: `Du vrai vers le magnétique : retranchez l’Est, ajoutez l’Ouest.`,
    visual: { type: "compass", trueRoute, variation, direction },
  });
}

function generateConversionQuestion(rng) {
  const distanceNm = pick([5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50], rng);
  const answer = Math.round(nauticalMilesToKm(distanceNm));
  const choice = uniqueNumericOptions(
    answer,
    [Math.round(distanceNm * 1.609), Math.round(distanceNm / 1.852), distanceNm * 2, distanceNm],
    (value) => `${Math.round(value)} km`,
    rng,
  );
  return generatedQuestion({
    kind: "conversion",
    seedPart: `${distanceNm}`,
    difficulty: 1,
    prompt: `À combien de kilomètres correspondent ${distanceNm} NM, au kilomètre près ?`,
    options: choice.options,
    correct: choice.correct,
    explanation: `${distanceNm} × 1,852 = ${nauticalMilesToKm(distanceNm).toFixed(2).replace(".", ",")} km, soit environ ${answer} km.`,
    hint: "Utilisez 1 NM = 1,852 km.",
    visual: { type: "distance", distanceNm },
  });
}

const GENERATORS = [
  generateWindQuestion,
  generateScaleQuestion,
  generateTimeQuestion,
  generateFuelQuestion,
  generateMagneticQuestion,
  generateConversionQuestion,
];

export function generateAlgorithmicQuestion(rng = Math.random, theme) {
  const allowed = theme === "performances"
    ? [generateFuelQuestion]
    : theme === "navigation"
      ? GENERATORS.filter((generator) => generator !== generateFuelQuestion)
      : GENERATORS;
  return pick(allowed, rng)(rng);
}

export function prepareQuestion(question, rng) {
  const indexed = question.options.map((label, index) => ({ label, originalIndex: index }));
  const mixed = shuffle(indexed, rng);
  return {
    ...question,
    options: mixed.map((option) => option.label),
    correct: mixed.findIndex((option) => option.originalIndex === question.correct),
  };
}

function generateUniqueQuestions(total, rng, theme) {
  const questions = [];
  const identifiers = new Set();
  let attempts = 0;
  while (questions.length < total && attempts < total * 40) {
    attempts += 1;
    const question = generateAlgorithmicQuestion(rng, theme);
    if (identifiers.has(question.id)) continue;
    identifiers.add(question.id);
    questions.push(question);
  }
  if (questions.length !== total) {
    throw new Error(`Impossible de produire ${total} questions calculées uniques.`);
  }
  return questions;
}

export function createSession({ mode = "quick", theme = "all", count, seed = Date.now() } = {}) {
  const rng = createRng(seed);
  if (mode === "navigation") {
    const total = count ?? 12;
    return generateUniqueQuestions(total, rng, "navigation").map((question) => prepareQuestion(question, rng));
  }

  if (mode === "theme" && theme !== "all") {
    const curated = shuffle(CURATED_QUESTIONS.filter((question) => question.theme === theme), rng);
    const dynamic = theme === "navigation" || theme === "performances"
      ? generateUniqueQuestions(Math.max(0, (count ?? 10) - curated.length), rng, theme)
      : [];
    return [...curated, ...dynamic].map((question) => prepareQuestion(question, rng));
  }

  const total = count ?? (mode === "exam" ? EXAM_RULES.questionCount : 15);
  const curated = shuffle(CURATED_QUESTIONS, rng).slice(0, Math.min(total, CURATED_QUESTIONS.length));
  const generated = generateUniqueQuestions(Math.max(0, total - curated.length), rng);
  return shuffle([...curated, ...generated], rng).map((question) => prepareQuestion(question, rng));
}

export function getQuestionCounts() {
  return THEMES.reduce((counts, theme) => {
    counts[theme.id] = CURATED_QUESTIONS.filter((question) => question.theme === theme.id).length;
    return counts;
  }, {});
}

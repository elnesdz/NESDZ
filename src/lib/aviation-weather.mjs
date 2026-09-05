const STATUTE_MILE_IN_KM = 1.609344;

function formatKm(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

function parseFraction(value) {
  const match = String(value || "").match(/^(\d+)\/(\d+)$/);
  if (!match) return null;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function parseStatuteMiles(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return null;

  const compact = normalized.replace(/\s+/g, " ");
  const mixedFraction = compact.match(/^(\d+)\s+(\d+\/\d+)$/);
  if (mixedFraction) {
    const fraction = parseFraction(mixedFraction[2]);
    return fraction == null ? null : Number(mixedFraction[1]) + fraction;
  }

  const fraction = parseFraction(compact);
  if (fraction != null) return fraction;

  const numeric = Number(compact);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

/**
 * AWC exposes METAR `visib` in statute miles. Keep the source unit visible and
 * add the metric conversion instead of silently relabelling the value as km.
 */
export function formatAwcVisibility(value) {
  if (value == null || String(value).trim() === "") return "—";

  const normalized = String(value).trim().toUpperCase().replace(/SM$/, "").trim();
  const lessThan = normalized.startsWith("M");
  const greaterThan = normalized.startsWith("P") || normalized.endsWith("+");
  const numericToken = normalized.replace(/^[MP]/, "").replace(/\+$/, "").trim();
  const miles = parseStatuteMiles(numericToken);

  if (miles == null) return `${normalized} SM`;

  const kilometres = formatKm(miles * STATUTE_MILE_IN_KM);
  if (lessThan) return `Moins de ${numericToken} SM (< ${kilometres} km)`;
  if (greaterThan) return `Plus de ${numericToken} SM (≥ ${kilometres} km)`;

  return `${numericToken} SM (~${kilometres} km)`;
}

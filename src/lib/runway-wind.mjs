export function normalizeAngle(value) {
  if (value === "" || value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return ((numeric % 360) + 360) % 360;
}

export function calculateWindComponents({
  windDirectionDeg,
  windSpeedKt,
  runwayHeadingDeg,
} = {}) {
  const windDirection = normalizeAngle(windDirectionDeg);
  const runwayHeading = normalizeAngle(runwayHeadingDeg);
  const speed = Number(windSpeedKt);

  if (
    windDirection == null ||
    runwayHeading == null ||
    !Number.isFinite(speed) ||
    speed < 0
  ) {
    return null;
  }

  const signedAngleDeg = ((windDirection - runwayHeading + 540) % 360) - 180;
  const angleDeg = Math.abs(signedAngleDeg);
  const radians = (angleDeg * Math.PI) / 180;
  const headwindKt = Math.cos(radians) * speed;
  const crosswindKt = Math.abs(Math.sin(radians) * speed);

  return {
    angleDeg,
    signedAngleDeg,
    headwindKt,
    crosswindKt,
    crosswindSide:
      crosswindKt < 0.05
        ? "axis"
        : signedAngleDeg > 0
          ? "right"
          : "left",
  };
}

export function chooseBestRunwayAxis(axes, windDirectionDeg, windSpeedKt) {
  if (!Array.isArray(axes) || axes.length === 0 || Number(windSpeedKt) <= 0) {
    return null;
  }

  return axes.reduce((best, axis) => {
    const components = calculateWindComponents({
      windDirectionDeg,
      windSpeedKt,
      runwayHeadingDeg: axis?.headingDeg,
    });

    if (!components) return best;
    if (!best || components.headwindKt > best.components.headwindKt) {
      return { axis, components };
    }
    return best;
  }, null);
}

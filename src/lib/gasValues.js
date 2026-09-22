export const GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY =
  "eco_monitoring_gas_value_correction_disabled";

export function applyGasValueCorrection(value, useAbsoluteValues = true) {
  if (!useAbsoluteValues || value === null || value === undefined) {
    return value;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.abs(numericValue) : value;
}

export function applyGasPointValueCorrection(points, useAbsoluteValues = true) {
  if (!Array.isArray(points)) {
    return [];
  }

  if (!useAbsoluteValues) {
    return points;
  }

  return points.map((point) => ({
    ...point,
    value: applyGasValueCorrection(point.value, useAbsoluteValues),
  }));
}

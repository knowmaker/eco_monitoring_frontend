export function normalizeChartValue(value, precision = 4) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(precision)) : value;
}

export function formatAxisValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }
  const abs = Math.abs(number);
  if (abs > 0 && abs < 0.01) {
    return number.toFixed(4);
  }
  if (abs > 0 && abs < 1) {
    return number.toFixed(3);
  }
  return number.toFixed(2);
}

export function formatTooltipValue(value, precision) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  if (!Number.isInteger(precision)) {
    return formatAxisValue(number);
  }
  return number.toFixed(precision).replace(/\.?0+$/, "");
}

export function formatHourInterval(hour) {
  const startHour = String(hour).padStart(2, "0");
  return `${startHour}:00-${startHour}:59`;
}

export function formatHourIntervalAxisLabel(value) {
  return String(value).replace("-", "-\n");
}

export function formatDayAxisLabel(value) {
  return String(value).replace(" число", "");
}

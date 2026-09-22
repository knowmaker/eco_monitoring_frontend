const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function formatLatestTime(bucketMs) {
  if (!Number.isFinite(bucketMs)) {
    return "нет данных";
  }

  const start = new Date(bucketMs);
  const end = new Date(bucketMs + 59 * 60 * 1000);
  const startText = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  const endTime = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);

  return `${startText}-${endTime}`;
}

export function formatLatestValue(value, unit = "", precision = null) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  const text = precision === null
    ? (Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2)).replace(/\.?0+$/, "")
    : value.toFixed(precision);

  return `${text}${unit ? ` ${unit}` : ""}`;
}

function formatPdkValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

export function getLimitStatus(value, limit) {
  const comparisonPdk = limit?.comparison_pdk;

  if (!Number.isFinite(value) || !Number.isFinite(comparisonPdk)) {
    return "neutral";
  }

  return value > comparisonPdk ? "danger" : "ok";
}

export function getLimitTitle(limit) {
  const pdkText = formatPdkValue(limit?.comparison_pdk);

  if (!pdkText) {
    return undefined;
  }

  return `ПДК: ${pdkText}`;
}

function normalizeDegrees(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return ((value % 360) + 360) % 360;
}

function toCardinal(degrees) {
  const normalized = normalizeDegrees(degrees);

  if (normalized === null) {
    return "-";
  }

  const index = Math.round(normalized / 45) % CARDINALS.length;
  return CARDINALS[index];
}

export function formatWindValue(direction, speed) {
  const cardinal = toCardinal(direction);
  const speedText = formatLatestValue(speed, "м/с");

  if (cardinal === "-" && speedText === "-") {
    return "-";
  }

  if (cardinal === "-") {
    return speedText;
  }

  if (speedText === "-") {
    return cardinal;
  }

  return (
    <>
      {speedText}
      <br />
      {cardinal}
    </>
  );
}

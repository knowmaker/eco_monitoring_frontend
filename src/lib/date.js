export function toIsoDay(day) {
  const date = day instanceof Date ? day : new Date(day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toIsoMonth(month) {
  const date = month instanceof Date ? month : new Date(month);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseIsoDay(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseIsoMonth(value) {
  const [year, month] = String(value || "")
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  if (!year || !month) {
    return null;
  }
  const date = new Date(year, month - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shiftDay(day, delta) {
  const date = new Date(day);
  date.setDate(date.getDate() + delta);
  return date;
}

export function shiftMonth(month, delta) {
  const date = new Date(month);
  date.setDate(1);
  date.setMonth(date.getMonth() + delta);
  return date;
}

export function getDaysInMonth(month) {
  const date = month instanceof Date ? month : new Date(month);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function toDateTimeInputValue(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${toIsoDay(date)}T${hh}:${mm}`;
}

export function toLocalDateTimeParam(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${toIsoDay(date)}T${hh}:${mm}:${ss}`;
}

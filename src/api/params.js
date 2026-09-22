import { toIsoDay, toIsoMonth, toLocalDateTimeParam } from "../lib/date";

export function formatDayParam(day) {
  if (typeof day === "string" && day.length >= 10) {
    return day.slice(0, 10);
  }
  const date = day instanceof Date ? day : new Date(day);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата запроса графика");
  }
  return toIsoDay(date);
}

export function formatMonthParam(month) {
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  const date = month instanceof Date ? month : new Date(month);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректный месяц запроса графика");
  }
  return toIsoMonth(date);
}

export function formatDateTimeParam(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректный интервал запроса сырых данных");
  }
  return toLocalDateTimeParam(date);
}

export function buildRawParams(monitoringPostId, start, end) {
  return new URLSearchParams({
    monitoring_post_id: String(monitoringPostId),
    from: formatDateTimeParam(start),
    to: formatDateTimeParam(end),
  });
}

import { getDaysInMonth, toLocalDateTimeParam } from "../../lib/date";

export function createEmptyPoints(axisValues, xKey) {
  return axisValues.map((value) => ({ [xKey]: value, value: null }));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function isWindDirectionSeries(item) {
  const key = normalizeText(item?.key);
  return key === "hor_win_dir" || key === "wind_direction";
}

export function isWindSpeedSeries(item) {
  const key = normalizeText(item?.key);
  return key === "hor_win_spd" || key === "wind_speed";
}

export function formatHourInterval(hour) {
  const startHour = String(hour).padStart(2, "0");
  return `${startHour}:00-${startHour}:59`;
}

export function formatTimeOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getHourBounds(day, hour) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    start,
    end,
    startParam: toLocalDateTimeParam(start),
    endParam: toLocalDateTimeParam(end),
  };
}

export function normalizeChartValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : value;
}

export function getProfilePeriodValue(profile, viewMode) {
  return viewMode === "month" ? profile.day : profile.hour;
}

export function hasProfileTemperatureData(profile) {
  return Boolean(
    (profile?.levels || []).some((level) => Number.isFinite(level.height) && Number.isFinite(level.temperature))
  );
}

export function formatProfilePeriodLabel(value, viewMode) {
  return viewMode === "month" ? `${String(value).padStart(2, "0")} число` : formatHourInterval(value);
}

export function formatProfileTooltipValue(value, unit) {
  return Number.isFinite(value) ? `${value} ${unit}` : "-";
}

export function getProfileInversionMarkLines(inversion) {
  if (
    !Number.isFinite(inversion?.power) ||
    inversion.power <= 0 ||
    !Number.isFinite(inversion?.lower) ||
    !Number.isFinite(inversion?.upper)
  ) {
    return [];
  }

  return [
    { name: "Низ инверсии", yAxis: normalizeChartValue(inversion.lower) },
    { name: "Верх инверсии", yAxis: normalizeChartValue(inversion.upper) },
  ];
}

export function createReadingsAxis(viewMode, month) {
  if (viewMode === "month") {
    const values = Array.from({ length: getDaysInMonth(month) }, (_, index) => index + 1);
    return {
      key: "day",
      values,
      labels: values.map((value) => `${String(value).padStart(2, "0")} число`),
      windLabelFormatter: (value) => String(value).padStart(2, "0"),
      emptyText: "Нет данных за выбранный месяц.",
    };
  }

  const values = Array.from({ length: 24 }, (_, hour) => hour);
  return {
    key: "hour",
    values,
    labels: values.map(formatHourInterval),
    windLabelFormatter: (value) => `${String(value).padStart(2, "0")}:00`,
    emptyText: "Нет данных за выбранные сутки.",
  };
}

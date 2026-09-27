import { requestJson } from "./client";


export function fetchGasHeatmapTimeline(substanceCode, pastHours = 168, futureHours = 24) {
  const params = new URLSearchParams({
    substance_code: substanceCode,
    past_hours: String(pastHours),
    future_hours: String(futureHours),
  });
  return requestJson(`/api/v1/gases/heatmap/timeline?${params}`, {
    errorMessage: "Ошибка загрузки временной ленты",
    validate: (value) => value && Array.isArray(value.items),
    validationMessage: "Некорректный формат временной ленты",
  });
}


export function fetchGasHeatmap(substanceCode, hourStart) {
  const params = new URLSearchParams({ substance_code: substanceCode, hour_start: hourStart });
  return requestJson(`/api/v1/gases/heatmap?${params}`, {
    errorMessage: "Ошибка загрузки тепловой карты",
    validate: (value) => value && Array.isArray(value.points),
    validationMessage: "Некорректный формат данных тепловой карты",
  });
}

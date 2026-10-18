import { requestJson } from "./client";


export function fetchConcentrationMapTimeline(substanceCode, pastHours = 336, futureHours = 24) {
  const params = new URLSearchParams({
    substance_code: substanceCode,
    past_hours: String(pastHours),
    future_hours: String(futureHours),
  });
  return requestJson(`/api/v1/concentration-map/timeline?${params}`, {
    errorMessage: "Ошибка загрузки временной ленты",
    validate: (value) => value && Array.isArray(value.items),
    validationMessage: "Некорректный формат временной ленты",
  });
}


export function fetchConcentrationMap(substanceCode, hourStart) {
  const params = new URLSearchParams({ substance_code: substanceCode, hour_start: hourStart });
  return requestJson(`/api/v1/concentration-map?${params}`, {
    errorMessage: "Ошибка загрузки карты концентраций",
    validate: (value) => value && Array.isArray(value.cells),
    validationMessage: "Некорректный формат данных карты концентраций",
  });
}

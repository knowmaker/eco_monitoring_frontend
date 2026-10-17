import { requestJson } from "./client";
import { formatDateTimeParam } from "./params";


export function fetchTemperatureMap(hourStart = null) {
  const query = hourStart
    ? `?${new URLSearchParams({ hour_start: formatDateTimeParam(hourStart) })}`
    : "";
  return requestJson(`/api/v1/temperature-map${query}`, {
    errorMessage: "Ошибка загрузки температурных слоёв",
    validate: (value) => value && Array.isArray(value.stations),
    validationMessage: "Некорректный формат данных температурных слоёв",
  });
}

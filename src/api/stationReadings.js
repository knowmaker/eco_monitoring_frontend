import { requestJson } from "./client";

export async function fetchStationLatestReadings(monitoringPostId) {
  return requestJson(`/api/v1/station-readings/latest?monitoring_post_id=${monitoringPostId}`, {
    errorMessage: "Ошибка загрузки последних показаний станции",
    validate: (value) => value && Object.prototype.hasOwnProperty.call(value, "timestamp_ms"),
    validationMessage: "Некорректный формат ответа /api/v1/station-readings/latest",
  });
}

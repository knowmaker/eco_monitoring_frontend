import { requestJson } from "./client";
import { formatDayParam } from "./params";

export async function fetchRawMqttPayload(monitoringPostId, day, limit = 100) {
  const params = new URLSearchParams({
    monitoring_post_id: String(monitoringPostId),
    limit: String(limit),
  });
  if (day) {
    params.set("date", formatDayParam(day));
  }

  return requestJson(`/api/v1/raw-mqtt-payload/admin?${params.toString()}`, {
    auth: true,
    errorMessage: "Ошибка загрузки сырых пакетов",
    validate: (value) => value && Array.isArray(value.records),
    validationMessage: "Некорректный формат ответа /api/v1/raw-mqtt-payload/admin",
  });
}

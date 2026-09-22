import { requestJson } from "./client";

export async function fetchAvailableDeviceState(monitoringPostId) {
  const payload = await requestJson(`/api/v1/device-state/available?monitoring_post_id=${monitoringPostId}`, {
    errorMessage: "Ошибка загрузки устройств станции",
    validate: (value) => value && Array.isArray(value.devices),
    validationMessage: "Некорректный формат ответа /api/v1/device-state/available",
  });
  return payload.devices;
}

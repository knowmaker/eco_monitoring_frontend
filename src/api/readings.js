import { requestJson } from "./client";
import { buildRawParams, formatDayParam, formatMonthParam } from "./params";

const SERIES_ENDPOINTS = {
  dust: {
    resource: "dust-state",
    graphName: "dust-state",
    validate: (payload) => payload && Array.isArray(payload.series),
  },
  meteo: {
    resource: "meteo-state",
    graphName: "meteo-state",
    validate: (payload) => payload && Array.isArray(payload.series),
  },
  ivtm: {
    resource: "ivtm-state",
    graphName: "ivtm-state",
    validate: (payload) => payload && Array.isArray(payload.series),
  },
};

function endpoint(resource, segment, params) {
  return `/api/v1/${resource}/${segment}?${params.toString()}`;
}

function aggregateParams(monitoringPostId, key, value) {
  return new URLSearchParams({
    monitoring_post_id: String(monitoringPostId),
    [key]: value,
  });
}

function fetchSeriesAggregate(deviceType, segment, monitoringPostId, periodValue) {
  const config = SERIES_ENDPOINTS[deviceType];
  const isMonthly = segment === "monthly";
  const periodKey = isMonthly ? "month" : "date";
  const formattedPeriod = isMonthly ? formatMonthParam(periodValue) : formatDayParam(periodValue);

  return requestJson(endpoint(config.resource, segment, aggregateParams(monitoringPostId, periodKey, formattedPeriod)), {
    errorMessage: `Ошибка загрузки ${isMonthly ? "месячного графика" : "графика"} ${config.graphName}`,
    validate: config.validate,
    validationMessage: `Некорректный формат ответа /api/v1/${config.resource}/${segment}`,
  });
}

function fetchSeriesRaw(deviceType, monitoringPostId, start, end) {
  const config = SERIES_ENDPOINTS[deviceType];
  return requestJson(endpoint(config.resource, "raw", buildRawParams(monitoringPostId, start, end)), {
    auth: true,
    errorMessage: `Ошибка загрузки сырых данных ${config.graphName}`,
    validate: config.validate,
    validationMessage: `Некорректный формат ответа /api/v1/${config.resource}/raw`,
  });
}

function validateGas(payload) {
  return payload && Array.isArray(payload.substances);
}

function validateProfiles(payload) {
  return payload && Array.isArray(payload.profiles);
}

export async function fetchGasSensorsHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  return requestJson(
    endpoint("gas-sensors", "hourly", aggregateParams(monitoringPostId, "date", date)),
    {
      errorMessage: "Ошибка загрузки графика gas-sensors",
      validate: validateGas,
      validationMessage: "Некорректный формат ответа /api/v1/gas-sensors/hourly",
    }
  );
}

export async function fetchGasSensorsMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  return requestJson(
    endpoint("gas-sensors", "monthly", aggregateParams(monitoringPostId, "month", monthParam)),
    {
      errorMessage: "Ошибка загрузки месячного графика gas-sensors",
      validate: validateGas,
      validationMessage: "Некорректный формат ответа /api/v1/gas-sensors/monthly",
    }
  );
}

export async function fetchGasSensorsRaw(monitoringPostId, start, end) {
  return requestJson(endpoint("gas-sensors", "raw", buildRawParams(monitoringPostId, start, end)), {
    auth: true,
    errorMessage: "Ошибка загрузки сырых данных gas-sensors",
    validate: validateGas,
    validationMessage: "Некорректный формат ответа /api/v1/gas-sensors/raw",
  });
}

export const fetchDustStateHourly = (monitoringPostId, day) =>
  fetchSeriesAggregate("dust", "hourly", monitoringPostId, day);

export const fetchDustStateMonthly = (monitoringPostId, month) =>
  fetchSeriesAggregate("dust", "monthly", monitoringPostId, month);

export const fetchDustStateRaw = (monitoringPostId, start, end) =>
  fetchSeriesRaw("dust", monitoringPostId, start, end);

export const fetchMeteoStateHourly = (monitoringPostId, day) =>
  fetchSeriesAggregate("meteo", "hourly", monitoringPostId, day);

export const fetchMeteoStateMonthly = (monitoringPostId, month) =>
  fetchSeriesAggregate("meteo", "monthly", monitoringPostId, month);

export const fetchMeteoStateRaw = (monitoringPostId, start, end) =>
  fetchSeriesRaw("meteo", monitoringPostId, start, end);

export const fetchIvtmStateHourly = (monitoringPostId, day) =>
  fetchSeriesAggregate("ivtm", "hourly", monitoringPostId, day);

export const fetchIvtmStateMonthly = (monitoringPostId, month) =>
  fetchSeriesAggregate("ivtm", "monthly", monitoringPostId, month);

export const fetchIvtmStateRaw = (monitoringPostId, start, end) =>
  fetchSeriesRaw("ivtm", monitoringPostId, start, end);

export async function fetchProfileStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  return requestJson(
    endpoint("profile-state", "hourly", aggregateParams(monitoringPostId, "date", date)),
    {
      errorMessage: "Ошибка загрузки профиля температуры",
      validate: validateProfiles,
      validationMessage: "Некорректный формат ответа /api/v1/profile-state/hourly",
    }
  );
}

export async function fetchProfileStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  return requestJson(
    endpoint("profile-state", "monthly", aggregateParams(monitoringPostId, "month", monthParam)),
    {
      errorMessage: "Ошибка загрузки месячного профиля температуры",
      validate: validateProfiles,
      validationMessage: "Некорректный формат ответа /api/v1/profile-state/monthly",
    }
  );
}

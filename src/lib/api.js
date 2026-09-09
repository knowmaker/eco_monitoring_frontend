const rawBase = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE_URL = rawBase.replace(/\/+$/, "");
export const AUTH_TOKEN_STORAGE_KEY = "eco_monitoring_access_token";
export const AUTH_IS_ADMIN_STORAGE_KEY = "eco_monitoring_is_admin";

function buildUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function readError(response) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    // ignore parse errors
  }
  return `HTTP ${response.status}`;
}

function authHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDayParam(day) {
  if (typeof day === "string" && day.length >= 10) {
    return day.slice(0, 10);
  }
  const date = day instanceof Date ? day : new Date(day);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата запроса графика");
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthParam(month) {
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  const date = month instanceof Date ? month : new Date(month);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректный месяц запроса графика");
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function fetchMonitoringPosts() {
  const response = await fetch(buildUrl("/api/v1/monitoring-posts"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки станций: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.monitoring_posts)) {
    throw new Error("Некорректный формат ответа /api/v1/monitoring-posts");
  }
  return payload.monitoring_posts;
}

export async function fetchMonitoringPostsAdmin() {
  const response = await fetch(buildUrl("/api/v1/monitoring-posts/admin"), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки списка станций: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.monitoring_posts)) {
    throw new Error("Некорректный формат ответа /api/v1/monitoring-posts/admin");
  }
  return payload.monitoring_posts;
}

export async function updateMonitoringPost(monitoringPostId, payload) {
  const response = await fetch(buildUrl(`/api/v1/monitoring-posts/${monitoringPostId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка сохранения станции: ${await readError(response)}`);
  }

  return response.json();
}

export async function fetchAvailableDeviceState(monitoringPostId) {
  const response = await fetch(buildUrl(`/api/v1/device-state/available?monitoring_post_id=${monitoringPostId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки устройств станции: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.devices)) {
    throw new Error("Некорректный формат ответа /api/v1/device-state/available");
  }
  return payload.devices;
}

export async function fetchRawMqttPayload(monitoringPostId, day, limit = 100) {
  const params = new URLSearchParams({
    monitoring_post_id: String(monitoringPostId),
    limit: String(limit),
  });
  if (day) {
    params.set("date", formatDayParam(day));
  }

  const response = await fetch(buildUrl(`/api/v1/raw-mqtt-payload/admin?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки сырых пакетов: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error("Некорректный формат ответа /api/v1/raw-mqtt-payload/admin");
  }
  return payload;
}

export async function fetchStationLatestHourlyReadings(monitoringPostId) {
  const response = await fetch(
    buildUrl(`/api/v1/station-readings/latest-hourly?monitoring_post_id=${monitoringPostId}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки последних показаний станции: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "bucket_ms")) {
    throw new Error("Некорректный формат ответа /api/v1/station-readings/latest-hourly");
  }
  return payload;
}

export async function fetchGasSensorsHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/gas-sensors/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика gas-sensors: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.substances)) {
    throw new Error("Некорректный формат ответа /api/v1/gas-sensors/hourly");
  }
  return payload;
}

export async function fetchGasSensorsMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/gas-sensors/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика gas-sensors: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.substances)) {
    throw new Error("Некорректный формат ответа /api/v1/gas-sensors/monthly");
  }
  return payload;
}

export async function fetchDustStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/dust-state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика dust-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/dust-state/hourly");
  }
  return payload;
}

export async function fetchDustStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/dust-state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика dust-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/dust-state/monthly");
  }
  return payload;
}

export async function fetchMeteoStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/meteo-state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика meteo-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/meteo-state/hourly");
  }
  return payload;
}

export async function fetchMeteoStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/meteo-state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика meteo-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/meteo-state/monthly");
  }
  return payload;
}

export async function fetchIvtmStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/ivtm-state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика ivtm-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/ivtm-state/hourly");
  }
  return payload;
}

export async function fetchIvtmStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/ivtm-state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика ivtm-state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/ivtm-state/monthly");
  }
  return payload;
}

export async function fetchProfileStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/profile-state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки профиля температуры: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.profiles)) {
    throw new Error("Некорректный формат ответа /api/v1/profile-state/hourly");
  }
  return payload;
}

export async function fetchProfileStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/profile-state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного профиля температуры: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.profiles)) {
    throw new Error("Некорректный формат ответа /api/v1/profile-state/monthly");
  }
  return payload;
}

function getDownloadFilename(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function formatExportFilenameDate(value, isEnd) {
  if (!value) {
    return "unknown";
  }

  if (value.length === 10) {
    return `${value}_${isEnd ? "23-59" : "00-00"}`;
  }

  return value.slice(0, 16).replace("T", "_").replace(":", "-");
}

function buildExportFallbackFilename(payload) {
  const periodPart = `${formatExportFilenameDate(payload.start, false)}_to_${formatExportFilenameDate(payload.end, true)}`;

  return `eco_export_${payload.aggregation}_${periodPart}.xlsx`;
}

export async function downloadAggregatesExport(payload) {
  const response = await fetch(buildUrl("/api/v1/export/aggregates"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка экспорта данных: ${await readError(response)}`);
  }

  const blob = await response.blob();
  const filename = getDownloadFilename(response, buildExportFallbackFilename(payload));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

export async function registerByEmail(email) {
  const response = await fetch(buildUrl("/api/v1/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = await response.json();
  return {
    message: typeof payload?.message === "string" ? payload.message : "Регистрация выполнена.",
  };
}

export async function loginByEmailPassword(email, password) {
  const normalizedLogin = email.trim().toLowerCase();
  const response = await fetch(buildUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: normalizedLogin, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = await response.json();
  if (!payload || typeof payload.access_token !== "string" || payload.access_token.length < 10) {
    throw new Error("Некорректный ответ авторизации: нет access_token");
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    isAdmin: Boolean(payload.is_admin),
  };
}

export async function fetchCurrentUserProfile() {
  const response = await fetch(buildUrl("/api/v1/auth/me"), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки профиля: ${await readError(response)}`);
  }

  return response.json();
}

export async function updateCurrentUserProfile(payload) {
  const response = await fetch(buildUrl("/api/v1/auth/me"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ошибка сохранения профиля: ${await readError(response)}`);
  }

  return response.json();
}

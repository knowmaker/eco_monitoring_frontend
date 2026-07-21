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
  const response = await fetch(buildUrl("/api/v1/monitoring_posts"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки станций: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.monitoring_posts)) {
    throw new Error("Некорректный формат ответа /api/v1/monitoring_posts");
  }
  return payload.monitoring_posts;
}

export async function fetchMonitoringPostsAdmin() {
  const response = await fetch(buildUrl("/api/v1/monitoring_posts/admin"), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки списка станций: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.monitoring_posts)) {
    throw new Error("Некорректный формат ответа /api/v1/monitoring_posts/admin");
  }
  return payload.monitoring_posts;
}

export async function updateMonitoringPost(monitoringPostId, payload) {
  const response = await fetch(buildUrl(`/api/v1/monitoring_posts/${monitoringPostId}`), {
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
  const response = await fetch(buildUrl(`/api/v1/device_state/available?monitoring_post_id=${monitoringPostId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки устройств станции: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.devices)) {
    throw new Error("Некорректный формат ответа /api/v1/device_state/available");
  }
  return payload.devices;
}

export async function fetchStationLatestHourlyReadings(monitoringPostId) {
  const response = await fetch(
    buildUrl(`/api/v1/station_readings/latest_hourly?monitoring_post_id=${monitoringPostId}`),
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
    throw new Error("Некорректный формат ответа /api/v1/station_readings/latest_hourly");
  }
  return payload;
}

export async function fetchGasSensorsHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/gas_sensors/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика gas_sensors: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.substances)) {
    throw new Error("Некорректный формат ответа /api/v1/gas_sensors/hourly");
  }
  return payload;
}

export async function fetchGasSensorsMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/gas_sensors/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика gas_sensors: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.substances)) {
    throw new Error("Некорректный формат ответа /api/v1/gas_sensors/monthly");
  }
  return payload;
}

export async function fetchDustStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/dust_state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика dust_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/dust_state/hourly");
  }
  return payload;
}

export async function fetchDustStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/dust_state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика dust_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/dust_state/monthly");
  }
  return payload;
}

export async function fetchMeteoStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/meteo_state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика meteo_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/meteo_state/hourly");
  }
  return payload;
}

export async function fetchMeteoStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/meteo_state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика meteo_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/meteo_state/monthly");
  }
  return payload;
}

export async function fetchIvtmStateHourly(monitoringPostId, day) {
  const date = formatDayParam(day);
  const response = await fetch(
    buildUrl(`/api/v1/ivtm_state/hourly?monitoring_post_id=${monitoringPostId}&date=${date}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки графика ivtm_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/ivtm_state/hourly");
  }
  return payload;
}

export async function fetchIvtmStateMonthly(monitoringPostId, month) {
  const monthParam = formatMonthParam(month);
  const response = await fetch(
    buildUrl(`/api/v1/ivtm_state/monthly?monitoring_post_id=${monitoringPostId}&month=${monthParam}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Ошибка загрузки месячного графика ivtm_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.series)) {
    throw new Error("Некорректный формат ответа /api/v1/ivtm_state/monthly");
  }
  return payload;
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

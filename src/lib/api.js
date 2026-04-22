const rawBase = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE_URL = rawBase.replace(/\/+$/, "");
export const AUTH_TOKEN_STORAGE_KEY = "eco_monitoring_access_token";

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

export async function fetchLatestPlcState(monitoringPostId) {
  const response = await fetch(buildUrl(`/api/v1/plc_state/latest?monitoring_post_id=${monitoringPostId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки данных PLC: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || (!payload.plc_state && payload.plc_state !== null)) {
    throw new Error("Некорректный формат ответа /api/v1/plc_state/latest");
  }
  return payload.plc_state;
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

export async function fetchGasStateLatest(monitoringPostId) {
  const response = await fetch(buildUrl(`/api/v1/gas_state/latest?monitoring_post_id=${monitoringPostId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки данных gas_state: ${await readError(response)}`);
  }

  const payload = await response.json();
  if (!payload || (!payload.gas_state && payload.gas_state !== null)) {
    throw new Error("Некорректный формат ответа /api/v1/gas_state/latest");
  }
  return payload.gas_state;
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
  const response = await fetch(buildUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
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
  };
}

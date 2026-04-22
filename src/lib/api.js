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

export async function fetchMonitoringPosts() {
  const response = await fetch(buildUrl("/api/v1/monitoring_posts"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
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
    headers: {
      Accept: "application/json",
    },
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
    headers: {
      Accept: "application/json",
    },
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

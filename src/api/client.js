const rawBase = import.meta.env.VITE_API_BASE_URL ?? "";

export const API_BASE_URL = rawBase.replace(/\/+$/, "");
export const AUTH_TOKEN_STORAGE_KEY = "eco_monitoring_access_token";
export const AUTH_IS_ADMIN_STORAGE_KEY = "eco_monitoring_is_admin";

export function buildUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function readError(response) {
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

export function authHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestJson(
  path,
  {
    method = "GET",
    headers = {},
    body,
    auth = false,
    errorMessage = "Ошибка запроса",
    validate,
    validationMessage = "Некорректный формат ответа",
  } = {}
) {
  const requestHeaders = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(auth ? authHeaders() : {}),
    ...headers,
  };

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(errorMessage ? `${errorMessage}: ${detail}` : detail);
  }

  const payload = await response.json();
  if (validate && !validate(payload)) {
    throw new Error(validationMessage);
  }
  return payload;
}

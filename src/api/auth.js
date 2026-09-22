import { requestJson } from "./client";

export async function registerByEmail(email) {
  const payload = await requestJson("/api/v1/auth/register", {
    method: "POST",
    body: { email },
    errorMessage: "",
  });
  return {
    message: typeof payload?.message === "string" ? payload.message : "Регистрация выполнена.",
  };
}

export async function loginByEmailPassword(email, password) {
  const normalizedLogin = email.trim().toLowerCase();
  const payload = await requestJson("/api/v1/auth/login", {
    method: "POST",
    body: { email: normalizedLogin, password },
    errorMessage: "",
    validate: (value) => value && typeof value.access_token === "string" && value.access_token.length >= 10,
    validationMessage: "Некорректный ответ авторизации: нет access_token",
  });

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    isAdmin: Boolean(payload.is_admin),
  };
}

export async function fetchCurrentUserProfile() {
  return requestJson("/api/v1/auth/me", {
    auth: true,
    errorMessage: "Ошибка загрузки профиля",
  });
}

export async function updateCurrentUserProfile(payload) {
  return requestJson("/api/v1/auth/me", {
    method: "PATCH",
    body: payload,
    auth: true,
    errorMessage: "Ошибка сохранения профиля",
  });
}

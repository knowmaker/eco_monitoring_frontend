import { requestJson } from "./client";

const hasMonitoringPosts = (payload) => payload && Array.isArray(payload.monitoring_posts);

export async function fetchMonitoringPosts() {
  const payload = await requestJson("/api/v1/monitoring-posts", {
    errorMessage: "Ошибка загрузки станций",
    validate: hasMonitoringPosts,
    validationMessage: "Некорректный формат ответа /api/v1/monitoring-posts",
  });
  return payload.monitoring_posts;
}

export async function fetchMonitoringPostsAdmin() {
  const payload = await requestJson("/api/v1/monitoring-posts/admin", {
    auth: true,
    errorMessage: "Ошибка загрузки списка станций",
    validate: hasMonitoringPosts,
    validationMessage: "Некорректный формат ответа /api/v1/monitoring-posts/admin",
  });
  return payload.monitoring_posts;
}

export async function updateMonitoringPost(monitoringPostId, payload) {
  return requestJson(`/api/v1/monitoring-posts/${monitoringPostId}`, {
    method: "PATCH",
    body: payload,
    auth: true,
    errorMessage: "Ошибка сохранения станции",
  });
}

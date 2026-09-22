export const POST_TYPE_LABELS = {
  stationary: "Стационарный",
  mobile: "Мобильный",
  drone: "Дрон",
};

export function getPostTitle(post) {
  if (!post) {
    return "—";
  }
  return post.name || post.serial;
}

export function formatCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "—";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

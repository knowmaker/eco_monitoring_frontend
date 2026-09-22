import { authHeaders, buildUrl, readError } from "./client";

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

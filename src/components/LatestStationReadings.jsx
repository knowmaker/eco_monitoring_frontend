import { useEffect, useState } from "react";

import { fetchStationLatestHourlyReadings } from "../lib/api";

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DEVICE_TYPE_ORDER = ["gas", "dust", "meteo", "ivtm"];
const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
};

function formatLatestTime(bucketMs) {
  if (!Number.isFinite(bucketMs)) {
    return "нет данных";
  }

  const start = new Date(bucketMs);
  const end = new Date(bucketMs + 59 * 60 * 1000);
  const startText = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  const endTime = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);

  return `${startText}-${endTime}`;
}

function formatLatestValue(value, unit = "", precision = null) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const text = precision === null
    ? (Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2)).replace(/\.?0+$/, "")
    : value.toFixed(precision);
  return `${text}${unit ? ` ${unit}` : ""}`;
}

function formatPdkValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function getLimitStatus(value, limit) {
  const comparisonPdk = limit?.comparison_pdk;
  if (!Number.isFinite(value) || !Number.isFinite(comparisonPdk)) {
    return "neutral";
  }
  return value > comparisonPdk ? "danger" : "ok";
}

function getLimitTitle(limit) {
  const pdkText = formatPdkValue(limit?.comparison_pdk);
  if (!pdkText) {
    return undefined;
  }
  return `ПДК: ${pdkText}`;
}

function normalizeDegrees(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return ((value % 360) + 360) % 360;
}

function toCardinal(degrees) {
  const normalized = normalizeDegrees(degrees);
  if (normalized === null) {
    return "-";
  }
  const index = Math.round(normalized / 45) % CARDINALS.length;
  return CARDINALS[index];
}

function formatWindValue(direction, speed) {
  const cardinal = toCardinal(direction);
  const speedText = formatLatestValue(speed, "м/с");
  if (cardinal === "-" && speedText === "-") {
    return "-";
  }
  if (cardinal === "-") {
    return speedText;
  }
  if (speedText === "-") {
    return cardinal;
  }
  return (
    <>
      {speedText}
      <br />
      {cardinal}
    </>
  );
}

function LatestMetric({ label, value, unit, precision, displayValue, limit }) {
  const limitStatus = getLimitStatus(value, limit);
  return (
    <div className={`latest-metric latest-metric-${limitStatus}`} title={getLimitTitle(limit)}>
      <span className="latest-metric-label">{label}</span>
      <span className="latest-metric-value">{displayValue ?? formatLatestValue(value, unit, precision)}</span>
    </div>
  );
}

function LatestDeviceHeader({ title, bucketMs }) {
  return (
    <h4>
      <span>{title}</span>
      <time>{formatLatestTime(bucketMs)}</time>
    </h4>
  );
}

function renderLatestDeviceBlock(deviceType, latestReadings) {
  const device = latestReadings?.[deviceType];
  if (!device) {
    return null;
  }

  if (deviceType === "gas") {
    return (
      <div key={deviceType} className="latest-device-block">
        <LatestDeviceHeader title={DEVICE_TYPE_LABELS.gas} bucketMs={device.bucket_ms} />
        <div className="latest-metrics latest-metrics-gas">
          {device.substances.map((item) => (
            <LatestMetric
              key={item.substance_code}
              label={item.substance_code}
              value={item.value}
              precision={2}
              limit={item.limit}
            />
          ))}
        </div>
      </div>
    );
  }

  if (deviceType === "dust") {
    return (
      <div key={deviceType} className="latest-device-block">
        <LatestDeviceHeader title={DEVICE_TYPE_LABELS.dust} bucketMs={device.bucket_ms} />
        <div className="latest-metrics">
          <LatestMetric label="PM1" value={device.pm1} precision={4} limit={device.limits?.pm1} />
          <LatestMetric label="PM2.5" value={device.pm2} precision={4} limit={device.limits?.pm2} />
          <LatestMetric label="PM10" value={device.pm10} precision={4} limit={device.limits?.pm10} />
          <LatestMetric label="TSP" value={device.tsp} precision={4} limit={device.limits?.tsp} />
        </div>
      </div>
    );
  }

  if (deviceType === "meteo") {
    return (
      <div key={deviceType} className="latest-device-block">
        <LatestDeviceHeader title={DEVICE_TYPE_LABELS.meteo} bucketMs={device.bucket_ms} />
        <div className="latest-metrics">
          <LatestMetric label="Темп." value={device.air_temp} unit="°C" />
          <LatestMetric label="Влажн." value={device.air_hum} unit="%" />
          <LatestMetric label="Давл." value={device.atm_press} />
          <LatestMetric label="Ветер" displayValue={formatWindValue(device.hor_win_dir, device.hor_win_spd)} />
        </div>
      </div>
    );
  }

  if (deviceType === "ivtm") {
    return (
      <div key={deviceType} className="latest-device-block">
        <LatestDeviceHeader title={DEVICE_TYPE_LABELS.ivtm} bucketMs={device.bucket_ms} />
        <div className="latest-metrics">
          <LatestMetric label="Влажн." value={device.sensor_ivtm_hum} unit="%" />
          <LatestMetric label="Темп." value={device.sensor_ivtm_temp} unit="°C" />
        </div>
      </div>
    );
  }

  return null;
}

export default function LatestStationReadings({ monitoringPostId, refreshCounter = 0 }) {
  const [latestReadings, setLatestReadings] = useState(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [latestErrorText, setLatestErrorText] = useState("");

  useEffect(() => {
    if (!monitoringPostId) {
      setLatestReadings(null);
      setLatestErrorText("");
      setIsLoadingLatest(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLatest(true);
    setLatestErrorText("");

    fetchStationLatestHourlyReadings(monitoringPostId)
      .then((payload) => {
        if (!cancelled) {
          setLatestReadings(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLatestReadings(null);
          setLatestErrorText(error instanceof Error ? error.message : "Не удалось загрузить последние показания");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLatest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringPostId, refreshCounter]);

  return (
    <section className="latest-readings">
      <div className="latest-readings-header">
        <h3>Последние значения</h3>
      </div>

      {isLoadingLatest && <p className="station-card-hint">Загрузка последних показаний...</p>}
      {!isLoadingLatest && latestErrorText && <p className="station-card-error">{latestErrorText}</p>}
      {!isLoadingLatest && !latestErrorText && latestReadings?.bucket_ms !== null && latestReadings && (
        <div className="latest-readings-grid">
          {DEVICE_TYPE_ORDER.map((deviceType) => renderLatestDeviceBlock(deviceType, latestReadings))}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";

import { fetchStationLatestHourlyReadings } from "../lib/api";

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function formatLatestTime(bucketMs) {
  if (!Number.isFinite(bucketMs)) {
    return "нет данных";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(bucketMs));
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

export default function LatestStationReadings({ monitoringPostId }) {
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
  }, [monitoringPostId]);

  return (
    <section className="latest-readings">
      <div className="latest-readings-header">
        <h3>Последние значения</h3>
        <span>{formatLatestTime(latestReadings?.bucket_ms)}</span>
      </div>

      {isLoadingLatest && <p className="station-card-hint">Загрузка последних показаний...</p>}
      {!isLoadingLatest && latestErrorText && <p className="station-card-error">{latestErrorText}</p>}
      {!isLoadingLatest && !latestErrorText && latestReadings?.bucket_ms !== null && latestReadings && (
        <div className="latest-readings-grid">
          {latestReadings.gas && (
            <div className="latest-device-block">
              <h4>Газ</h4>
              <div className="latest-metrics latest-metrics-gas">
                {latestReadings.gas.substances.map((item) => (
                  <LatestMetric
                    key={item.substance_code}
                    label={item.substance_code}
                    value={item.value}
                    limit={item.limit}
                  />
                ))}
              </div>
            </div>
          )}

          {latestReadings.dust && (
            <div className="latest-device-block">
              <h4>Пыль</h4>
              <div className="latest-metrics">
                <LatestMetric
                  label="PM1"
                  value={latestReadings.dust.pm1}
                  precision={3}
                  limit={latestReadings.dust.limits?.pm1}
                />
                <LatestMetric
                  label="PM2.5"
                  value={latestReadings.dust.pm2}
                  precision={3}
                  limit={latestReadings.dust.limits?.pm2}
                />
                <LatestMetric
                  label="PM10"
                  value={latestReadings.dust.pm10}
                  precision={3}
                  limit={latestReadings.dust.limits?.pm10}
                />
                <LatestMetric
                  label="TSP"
                  value={latestReadings.dust.tsp}
                  precision={3}
                  limit={latestReadings.dust.limits?.tsp}
                />
              </div>
            </div>
          )}

          {latestReadings.meteo && (
            <div className="latest-device-block">
              <h4>Метео</h4>
              <div className="latest-metrics">
                <LatestMetric label="Темп." value={latestReadings.meteo.air_temp} unit="°C" />
                <LatestMetric label="Влажн." value={latestReadings.meteo.air_hum} unit="%" />
                <LatestMetric label="Давл." value={latestReadings.meteo.atm_press} />
                <LatestMetric
                  label="Ветер"
                  displayValue={formatWindValue(latestReadings.meteo.hor_win_dir, latestReadings.meteo.hor_win_spd)}
                />
              </div>
            </div>
          )}

          {latestReadings.ivtm && (
            <div className="latest-device-block">
              <h4>ИВТМ</h4>
              <div className="latest-metrics">
                <LatestMetric label="Влажн." value={latestReadings.ivtm.sensor_ivtm_hum} unit="%" />
                <LatestMetric label="Темп." value={latestReadings.ivtm.sensor_ivtm_temp} unit="°C" />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

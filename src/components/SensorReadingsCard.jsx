import { useEffect, useMemo, useState } from "react";

import {
  fetchDustStateHourly,
  fetchGasSensorsHourly,
  fetchIvtmStateHourly,
  fetchMeteoStateHourly,
} from "../lib/api";
import SimpleLineChart from "./SimpleLineChart";
import WindCompassStrip from "./WindCompassStrip";

const METEO_WIND_KEY = "__meteo_wind__";

const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
};

const GAS_SUBSTANCE_TABS = ["CO", "NO", "NO2", "O3", "SO2"];

const DEVICE_METRIC_TABS = {
  dust: [
    { key: "humidity", label: "Humidity" },
    { key: "temp", label: "Temperature" },
    { key: "pm1_concentration", label: "PM1" },
    { key: "pm2_concentration", label: "PM2.5" },
    { key: "pm10_concentration", label: "PM10" },
    { key: "tsp_concentration", label: "TSP" },
  ],
  meteo: [
    { key: "atm_press", label: "Pressure" },
    { key: "air_temp", label: "Air Temperature" },
    { key: "air_hum", label: "Air Humidity" },
    { key: METEO_WIND_KEY, label: "Wind" },
  ],
  ivtm: [
    { key: "sensor_ivtm_hum", label: "IVTM Humidity" },
    { key: "sensor_ivtm_temp", label: "IVTM Temperature" },
  ],
};

function createEmptyPoints() {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, value: null }));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isWindDirectionSeries(item) {
  const key = normalizeText(item?.key);
  const label = normalizeText(item?.label);
  return key === "hor_win_dir" || key === "wind_direction" || label === "wind direction";
}

function isWindSpeedSeries(item) {
  const key = normalizeText(item?.key);
  const label = normalizeText(item?.label);
  return key === "hor_win_spd" || key === "wind_speed" || label === "wind speed";
}

function toIsoDay(day) {
  const date = day instanceof Date ? day : new Date(day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDay(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftDay(day, delta) {
  const date = new Date(day);
  date.setDate(date.getDate() + delta);
  return date;
}

export default function SensorReadingsCard({ monitoringPostId, selectedDeviceType, onClose }) {
  const [day, setDay] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [series, setSeries] = useState([]);
  const [gasSubstances, setGasSubstances] = useState([]);
  const [selectedGasSubstance, setSelectedGasSubstance] = useState(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState(null);

  useEffect(() => {
    if (!monitoringPostId || !selectedDeviceType) {
      setSeries([]);
      setGasSubstances([]);
      setSelectedGasSubstance(null);
      setSelectedMetricKey(null);
      setErrorText("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorText("");
    setSeries([]);
    setGasSubstances([]);
    setSelectedMetricKey(null);

    const load = async () => {
      if (selectedDeviceType === "gas") {
        const gasSensors = await fetchGasSensorsHourly(monitoringPostId, day);
        if (cancelled) {
          return;
        }

        const substances = gasSensors.substances || [];
        setGasSubstances(substances);
        setSelectedGasSubstance((current) => {
          if (current && GAS_SUBSTANCE_TABS.includes(current)) {
            return current;
          }
          return GAS_SUBSTANCE_TABS[0];
        });
        return;
      }

      let payload;
      if (selectedDeviceType === "dust") {
        payload = await fetchDustStateHourly(monitoringPostId, day);
      } else if (selectedDeviceType === "meteo") {
        payload = await fetchMeteoStateHourly(monitoringPostId, day);
      } else if (selectedDeviceType === "ivtm") {
        payload = await fetchIvtmStateHourly(monitoringPostId, day);
      } else {
        payload = { series: [] };
      }

      if (cancelled) {
        return;
      }
      setSeries(payload.series || []);
    };

    load()
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setErrorText(error instanceof Error ? error.message : "Не удалось загрузить показания");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringPostId, selectedDeviceType, day]);

  useEffect(() => {
    if (selectedDeviceType !== "gas") {
      setSelectedGasSubstance(null);
      return;
    }
    setSelectedGasSubstance((current) => {
      if (current && GAS_SUBSTANCE_TABS.includes(current)) {
        return current;
      }
      return GAS_SUBSTANCE_TABS[0];
    });
  }, [selectedDeviceType]);

  const meteoWindDirectionSeries = useMemo(
    () => (selectedDeviceType === "meteo" ? series.find((item) => isWindDirectionSeries(item)) ?? null : null),
    [selectedDeviceType, series]
  );

  const meteoWindSpeedSeries = useMemo(
    () => (selectedDeviceType === "meteo" ? series.find((item) => isWindSpeedSeries(item)) ?? null : null),
    [selectedDeviceType, series]
  );

  const metricTabs = useMemo(() => {
    if (selectedDeviceType === "gas") {
      return [];
    }
    return DEVICE_METRIC_TABS[selectedDeviceType] || [];
  }, [selectedDeviceType]);

  useEffect(() => {
    if (!monitoringPostId || !selectedDeviceType || selectedDeviceType === "gas") {
      setSelectedMetricKey(null);
      return;
    }

    const availableKeys = metricTabs.map((item) => item.key);
    setSelectedMetricKey((current) => {
      if (current && availableKeys.includes(current)) {
        return current;
      }
      return availableKeys[0] ?? null;
    });
  }, [monitoringPostId, selectedDeviceType, metricTabs]);

  const effectiveSeries = useMemo(() => {
    if (selectedDeviceType === "gas") {
      if (!selectedGasSubstance) {
        return [];
      }
      const substance = gasSubstances.find((s) => s.substance_code === selectedGasSubstance);
      return [
        {
          key: selectedGasSubstance,
          label: selectedGasSubstance,
          points: substance?.points || createEmptyPoints(),
        },
      ];
    }

    if (!selectedMetricKey || selectedMetricKey === METEO_WIND_KEY) {
      return [];
    }
    const selectedSeries = series.find((s) => s.key === selectedMetricKey);
    const selectedMetric = metricTabs.find((item) => item.key === selectedMetricKey);
    return [
      {
        key: selectedMetricKey,
        label: selectedSeries?.label || selectedMetric?.label || selectedMetricKey,
        points: selectedSeries?.points || createEmptyPoints(),
      },
    ];
  }, [selectedDeviceType, selectedGasSubstance, gasSubstances, selectedMetricKey, series, metricTabs]);

  const isWindCompositeMetric = selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY;

  return (
    <aside className="readings-card">
      <div className="card-header">
        <h2>Показания датчиков</h2>
        <button type="button" className="card-close-btn" aria-label="Закрыть правую карточку" onClick={onClose}>
          ×
        </button>
      </div>

      {!monitoringPostId && <p className="station-card-hint">Сначала выберите станцию на карте.</p>}
      {monitoringPostId && !selectedDeviceType && (
        <p className="station-card-hint">Выберите тип датчика в левой карточке.</p>
      )}

      {monitoringPostId && selectedDeviceType && (
        <>
          <div className="readings-toolbar">
            <div className="readings-type">{DEVICE_TYPE_LABELS[selectedDeviceType] ?? selectedDeviceType}</div>
            <div className="day-switcher">
              <button type="button" aria-label="Предыдущий день" onClick={() => setDay((prev) => shiftDay(prev, -1))}>
                &lt;
              </button>
              <input
                type="date"
                aria-label="Выбрать дату графика"
                value={toIsoDay(day)}
                onChange={(event) => {
                  const nextDay = parseIsoDay(event.target.value);
                  if (nextDay) {
                    setDay(nextDay);
                  }
                }}
              />
              <button type="button" aria-label="Следующий день" onClick={() => setDay((prev) => shiftDay(prev, 1))}>
                &gt;
              </button>
            </div>
          </div>

          {selectedDeviceType === "gas" && (
            <div className="gas-tabs">
              {GAS_SUBSTANCE_TABS.map((substanceCode) => (
                <button
                  key={substanceCode}
                  type="button"
                  className={`gas-tab${selectedGasSubstance === substanceCode ? " gas-tab-active" : ""}`}
                  onClick={() => setSelectedGasSubstance(substanceCode)}
                >
                  {substanceCode}
                </button>
              ))}
            </div>
          )}

          {selectedDeviceType !== "gas" && metricTabs.length > 1 && (
            <div className="metric-tabs">
              {metricTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`metric-tab${selectedMetricKey === item.key ? " metric-tab-active" : ""}`}
                  onClick={() => setSelectedMetricKey(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {isLoading && <p className="station-card-hint">Загрузка графика...</p>}
          {!isLoading && errorText && <p className="station-card-error">{errorText}</p>}
          {!isLoading &&
            !errorText &&
            (isWindCompositeMetric ? (
              <WindCompassStrip
                directionPoints={meteoWindDirectionSeries?.points ?? []}
                speedPoints={meteoWindSpeedSeries?.points ?? []}
              />
            ) : (
              <SimpleLineChart series={effectiveSeries} />
            ))}
        </>
      )}
    </aside>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import {
  fetchDustStateHourly,
  fetchDustStateMonthly,
  fetchGasSensorsHourly,
  fetchGasSensorsMonthly,
  fetchIvtmStateHourly,
  fetchIvtmStateMonthly,
  fetchMeteoStateHourly,
  fetchMeteoStateMonthly,
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
const DUST_METRIC_TABS = [
  { key: "pm1_concentration", label: "PM1" },
  { key: "pm2_concentration", label: "PM2.5" },
  { key: "pm10_concentration", label: "PM10" },
  { key: "tsp_concentration", label: "TSP" },
];
const DUST_METRIC_KEYS = DUST_METRIC_TABS.map((item) => item.key);

const DEVICE_METRIC_TABS = {
  meteo: [
    { key: "air_temp", label: "Температура воздуха" },
    { key: "air_hum", label: "Влажность воздуха" },
    { key: "atm_press", label: "Давление" },
    { key: METEO_WIND_KEY, label: "Ветер" },
  ],
  ivtm: [
    { key: "sensor_ivtm_hum", label: "IVTM Humidity" },
    { key: "sensor_ivtm_temp", label: "IVTM Temperature" },
  ],
};

const METRIC_LABELS_BY_KEY = Object.fromEntries(
  [DUST_METRIC_TABS, ...Object.values(DEVICE_METRIC_TABS)]
    .flat()
    .map((item) => [item.key, item.label])
);

function createEmptyPoints(axisValues, xKey) {
  return axisValues.map((value) => ({ [xKey]: value, value: null }));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isWindDirectionSeries(item) {
  const key = normalizeText(item?.key);
  return key === "hor_win_dir" || key === "wind_direction";
}

function isWindSpeedSeries(item) {
  const key = normalizeText(item?.key);
  return key === "hor_win_spd" || key === "wind_speed";
}

function getMetricLabel(key) {
  return METRIC_LABELS_BY_KEY[key] || key;
}

function toIsoDay(day) {
  const date = day instanceof Date ? day : new Date(day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIsoMonth(month) {
  const date = month instanceof Date ? month : new Date(month);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

function parseIsoMonth(value) {
  const [year, month] = String(value || "")
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  if (!year || !month) {
    return null;
  }
  const date = new Date(year, month - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftDay(day, delta) {
  const date = new Date(day);
  date.setDate(date.getDate() + delta);
  return date;
}

function shiftMonth(month, delta) {
  const date = new Date(month);
  date.setDate(1);
  date.setMonth(date.getMonth() + delta);
  return date;
}

function getDaysInMonth(month) {
  const date = month instanceof Date ? month : new Date(month);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export default function SensorReadingsCard({ monitoringPostId, selectedDeviceType, onClose }) {
  const [viewMode, setViewMode] = useState("day");
  const [day, setDay] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [series, setSeries] = useState([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [gasSubstances, setGasSubstances] = useState([]);
  const [selectedGasSubstance, setSelectedGasSubstance] = useState(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState(null);

  const axis = useMemo(() => {
    if (viewMode === "month") {
      const values = Array.from({ length: getDaysInMonth(month) }, (_, index) => index + 1);
      return {
        key: "day",
        values,
        labels: values.map((value) => String(value).padStart(2, "0")),
        windLabelFormatter: (value) => String(value).padStart(2, "0"),
        emptyText: "Нет данных за выбранный месяц.",
      };
    }

    const values = Array.from({ length: 24 }, (_, hour) => hour);
    return {
      key: "hour",
      values,
      labels: values.map((value) => String(value).padStart(2, "0")),
      windLabelFormatter: (value) => `${String(value).padStart(2, "0")}:00`,
      emptyText: "Нет данных за выбранные сутки.",
    };
  }, [viewMode, month]);


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

    const load = async () => {
      const periodValue = viewMode === "month" ? month : day;

      if (selectedDeviceType === "gas") {
        const gasSensors =
          viewMode === "month"
            ? await fetchGasSensorsMonthly(monitoringPostId, periodValue)
            : await fetchGasSensorsHourly(monitoringPostId, periodValue);
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
        payload =
          viewMode === "month"
            ? await fetchDustStateMonthly(monitoringPostId, periodValue)
            : await fetchDustStateHourly(monitoringPostId, periodValue);
      } else if (selectedDeviceType === "meteo") {
        payload =
          viewMode === "month"
            ? await fetchMeteoStateMonthly(monitoringPostId, periodValue)
            : await fetchMeteoStateHourly(monitoringPostId, periodValue);
      } else if (selectedDeviceType === "ivtm") {
        payload =
          viewMode === "month"
            ? await fetchIvtmStateMonthly(monitoringPostId, periodValue)
            : await fetchIvtmStateHourly(monitoringPostId, periodValue);
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
  }, [monitoringPostId, selectedDeviceType, day, month, viewMode, refreshCounter]);

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
    if (!monitoringPostId || !selectedDeviceType || selectedDeviceType === "gas" || selectedDeviceType === "dust") {
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
          points: substance?.points || createEmptyPoints(axis.values, axis.key),
        },
      ];
    }

    if (selectedDeviceType === "dust") {
      return DUST_METRIC_KEYS.map((key) => {
        const item = series.find((candidate) => candidate.key === key);
        return item
          ? {
              key: item.key,
              label: getMetricLabel(item.key),
              points: item.points || createEmptyPoints(axis.values, axis.key),
            }
          : null;
      }).filter(Boolean);
    }

    if (!selectedMetricKey || selectedMetricKey === METEO_WIND_KEY) {
      return [];
    }
    const selectedSeries = series.find((s) => s.key === selectedMetricKey);
    return [
      {
        key: selectedMetricKey,
        label: getMetricLabel(selectedMetricKey),
        points: selectedSeries?.points || createEmptyPoints(axis.values, axis.key),
      },
    ];
  }, [selectedDeviceType, selectedGasSubstance, gasSubstances, selectedMetricKey, series, axis]);

  const isWindCompositeMetric = selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY;
  const dateInputType = viewMode === "month" ? "month" : "date";
  const dateInputValue = viewMode === "month" ? toIsoMonth(month) : toIsoDay(day);
  const maxDateInputValue = viewMode === "month" ? toIsoMonth(new Date()) : toIsoDay(new Date());
  const isNextPeriodDisabled = dateInputValue >= maxDateInputValue;

  const shiftPeriod = (delta) => {
    if (viewMode === "month") {
      setMonth((prev) => {
        const nextMonth = shiftMonth(prev, delta);
        return delta > 0 && toIsoMonth(nextMonth) > maxDateInputValue ? prev : nextMonth;
      });
      return;
    }
    setDay((prev) => {
      const nextDay = shiftDay(prev, delta);
      return delta > 0 && toIsoDay(nextDay) > maxDateInputValue ? prev : nextDay;
    });
  };

  const handleDateInputChange = (value) => {
    if (viewMode === "month") {
      const nextMonth = parseIsoMonth(value);
      if (nextMonth && toIsoMonth(nextMonth) <= maxDateInputValue) {
        setMonth(nextMonth);
      }
      return;
    }

    const nextDay = parseIsoDay(value);
    if (nextDay && toIsoDay(nextDay) <= maxDateInputValue) {
      setDay(nextDay);
    }
  };

  return (
    <aside className="readings-card">
      <div className="card-header">
        <h2>Исторические наблюдения</h2>
        <div className="card-header-actions">
          <button
            type="button"
            className="card-refresh-btn"
            onClick={() => setRefreshCounter((value) => value + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className="card-close-btn" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {monitoringPostId && selectedDeviceType && (
        <>
          <div className="readings-toolbar">
            <div className="readings-type">{DEVICE_TYPE_LABELS[selectedDeviceType] ?? selectedDeviceType}</div>
            <div className="period-controls">
              <div className="period-switcher">
                <button
                  type="button"
                  className={`period-tab${viewMode === "day" ? " period-tab-active" : ""}`}
                  onClick={() => setViewMode("day")}
                >
                  День
                </button>
                <button
                  type="button"
                  className={`period-tab${viewMode === "month" ? " period-tab-active" : ""}`}
                  onClick={() => setViewMode("month")}
                >
                  Месяц
                </button>
              </div>
              <div className="day-switcher">
                <button type="button" onClick={() => shiftPeriod(-1)}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <input
                  type={dateInputType}
                  value={dateInputValue}
                  max={maxDateInputValue}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                />
                <button type="button" disabled={isNextPeriodDisabled} onClick={() => shiftPeriod(1)}>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
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
                xKey={axis.key}
                xValues={axis.values}
                labelFormatter={axis.windLabelFormatter}
                emptyText={axis.emptyText}
              />
            ) : (
              <SimpleLineChart
                series={effectiveSeries}
                xKey={axis.key}
                xValues={axis.values}
                xLabels={axis.labels}
                emptyText={axis.emptyText}
              />
            ))}
        </>
      )}
    </aside>
  );
}

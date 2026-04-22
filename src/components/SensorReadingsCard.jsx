import { useEffect, useMemo, useState } from "react";

import {
  fetchDustStateHourly,
  fetchGasSensorsHourly,
  fetchGasStateLatest,
  fetchIvtmStateHourly,
  fetchMeteoStateHourly,
} from "../lib/api";
import SimpleLineChart from "./SimpleLineChart";

const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
};

function toIsoDay(day) {
  const date = day instanceof Date ? day : new Date(day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDay(day, delta) {
  const date = new Date(day);
  date.setDate(date.getDate() + delta);
  return date;
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU");
}

export default function SensorReadingsCard({ monitoringPostId, selectedDeviceType }) {
  const [day, setDay] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [series, setSeries] = useState([]);
  const [gasSubstances, setGasSubstances] = useState([]);
  const [selectedGasSubstance, setSelectedGasSubstance] = useState(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState(null);
  const [latestGasState, setLatestGasState] = useState(null);

  useEffect(() => {
    if (!monitoringPostId || !selectedDeviceType) {
      setSeries([]);
      setGasSubstances([]);
      setSelectedGasSubstance(null);
      setSelectedMetricKey(null);
      setLatestGasState(null);
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
    setLatestGasState(null);

    const load = async () => {
      if (selectedDeviceType === "gas") {
        const [gasState, gasSensors] = await Promise.all([
          fetchGasStateLatest(monitoringPostId),
          fetchGasSensorsHourly(monitoringPostId, day),
        ]);
        if (cancelled) {
          return;
        }

        const substances = gasSensors.substances || [];
        setLatestGasState(gasState);
        setGasSubstances(substances);
        setSelectedGasSubstance((current) => {
          if (current && substances.some((s) => s.substance_code === current)) {
            return current;
          }
          return substances[0]?.substance_code ?? null;
        });
        setSelectedMetricKey(null);
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
      const nextSeries = payload.series || [];
      setSeries(nextSeries);
      setSelectedMetricKey((current) => {
        if (current && nextSeries.some((s) => s.key === current)) {
          return current;
        }
        return nextSeries[0]?.key ?? null;
      });
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

  const effectiveSeries = useMemo(() => {
    if (selectedDeviceType === "gas") {
      if (!selectedGasSubstance) {
        return [];
      }
      const substance = gasSubstances.find((s) => s.substance_code === selectedGasSubstance);
      if (!substance) {
        return [];
      }
      return [
        {
          key: substance.substance_code,
          label: substance.substance_code,
          points: substance.points,
        },
      ];
    }

    if (!selectedMetricKey) {
      return [];
    }
    const selectedSeries = series.find((s) => s.key === selectedMetricKey);
    return selectedSeries ? [selectedSeries] : [];
  }, [selectedDeviceType, selectedGasSubstance, gasSubstances, selectedMetricKey, series]);

  return (
    <aside className="readings-card">
      <h2>Показания датчиков</h2>

      {!monitoringPostId && <p className="station-card-hint">Сначала выберите станцию на карте.</p>}
      {monitoringPostId && !selectedDeviceType && (
        <p className="station-card-hint">Выберите тип датчика в левой карточке.</p>
      )}

      {monitoringPostId && selectedDeviceType && (
        <>
          <div className="readings-toolbar">
            <div className="readings-type">{DEVICE_TYPE_LABELS[selectedDeviceType] ?? selectedDeviceType}</div>
            <div className="day-switcher">
              <button type="button" onClick={() => setDay((prev) => shiftDay(prev, -1))}>
                &lt;
              </button>
              <span>{toIsoDay(day)}</span>
              <button type="button" onClick={() => setDay((prev) => shiftDay(prev, 1))}>
                &gt;
              </button>
            </div>
          </div>

          {selectedDeviceType === "gas" && (
            <div className="gas-meta">
              <div className="gas-meta-row">
                <span>Последняя запись gas_state</span>
                <span>{latestGasState ? formatMs(latestGasState.device_timestamp_ms) : "—"}</span>
              </div>
              <div className="gas-meta-row">
                <span>Статус калибровки</span>
                <span>{latestGasState?.calibration_status || "—"}</span>
              </div>
            </div>
          )}

          {selectedDeviceType === "gas" && (
            <div className="gas-tabs">
              {gasSubstances.map((substance) => (
                <button
                  key={substance.substance_code}
                  type="button"
                  className={`gas-tab${selectedGasSubstance === substance.substance_code ? " gas-tab-active" : ""}`}
                  onClick={() => setSelectedGasSubstance(substance.substance_code)}
                >
                  {substance.substance_code}
                </button>
              ))}
            </div>
          )}

          {selectedDeviceType !== "gas" && series.length > 1 && (
            <div className="metric-tabs">
              {series.map((item) => (
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
          {!isLoading && !errorText && <SimpleLineChart series={effectiveSeries} />}
        </>
      )}
    </aside>
  );
}

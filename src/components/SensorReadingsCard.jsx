import { useEffect, useMemo, useState } from "react";

import {
  fetchDustStateHourly,
  fetchGasSensorsHourly,
  fetchGasStateLatest,
  fetchIvtmStateHourly,
  fetchMeteoStateHourly,
} from "../lib/api";
import SimpleLineChart from "./SimpleLineChart";
import WindCompassStrip from "./WindCompassStrip";

const METEO_WIND_KEY = "__meteo_wind__";

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

const DEVICE_TYPE_LABELS = {
  gas: "Р“Р°Р·",
  dust: "РџС‹Р»СЊ",
  meteo: "РњРµС‚РµРѕ",
  ivtm: "РР’РўРњ",
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
    return "вЂ”";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "вЂ”";
  }
  return date.toLocaleString("ru-RU");
}

export default function SensorReadingsCard({ monitoringPostId, selectedDeviceType, onClose }) {
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
    };

    load()
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setErrorText(error instanceof Error ? error.message : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕРєР°Р·Р°РЅРёСЏ");
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
    if (selectedDeviceType !== "meteo") {
      return series;
    }

    const nonWindSeries = series.filter((item) => !isWindDirectionSeries(item) && !isWindSpeedSeries(item));
    if (!meteoWindDirectionSeries && !meteoWindSpeedSeries) {
      return nonWindSeries;
    }
    return [...nonWindSeries, { key: METEO_WIND_KEY, label: "Wind" }];
  }, [selectedDeviceType, series, meteoWindDirectionSeries, meteoWindSpeedSeries]);

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
    if (selectedMetricKey === METEO_WIND_KEY) {
      return [];
    }
    const selectedSeries = series.find((s) => s.key === selectedMetricKey);
    return selectedSeries ? [selectedSeries] : [];
  }, [selectedDeviceType, selectedGasSubstance, gasSubstances, selectedMetricKey, series]);

  const isWindCompositeMetric = selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY;

  return (
    <aside className="readings-card">
      <div className="card-header">
        <h2>Показания датчиков</h2>
        <button type="button" className="card-close-btn" aria-label="Закрыть правую карточку" onClick={onClose}>
          x
        </button>
      </div>

      {!monitoringPostId && <p className="station-card-hint">РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ СЃС‚Р°РЅС†РёСЋ РЅР° РєР°СЂС‚Рµ.</p>}
      {monitoringPostId && !selectedDeviceType && (
        <p className="station-card-hint">Р’С‹Р±РµСЂРёС‚Рµ С‚РёРї РґР°С‚С‡РёРєР° РІ Р»РµРІРѕР№ РєР°СЂС‚РѕС‡РєРµ.</p>
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
                <span>РџРѕСЃР»РµРґРЅСЏСЏ Р·Р°РїРёСЃСЊ gas_state</span>
                <span>{latestGasState ? formatMs(latestGasState.device_timestamp_ms) : "вЂ”"}</span>
              </div>
              <div className="gas-meta-row">
                <span>РЎС‚Р°С‚СѓСЃ РєР°Р»РёР±СЂРѕРІРєРё</span>
                <span>{latestGasState?.calibration_status || "вЂ”"}</span>
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

          {isLoading && <p className="station-card-hint">Р—Р°РіСЂСѓР·РєР° РіСЂР°С„РёРєР°...</p>}
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



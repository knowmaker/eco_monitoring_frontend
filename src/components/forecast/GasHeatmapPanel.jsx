import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { fetchGasHeatmap, fetchGasHeatmapTimeline } from "../../api/gasHeatmap";
import { GAS_HEATMAP_MAX_VALUE, GAS_HEATMAP_MIN_VALUE } from "../../domain/gasHeatmap";
import ScrollablePanel from "../layout/ScrollablePanel";
import HeatmapTimeline from "./HeatmapTimeline";


const GASES = ["CO", "NO", "NO2", "O3", "SO2"];

function formatHour(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatValue(value) {
  return Number.isFinite(value)
    ? value.toLocaleString("ru-RU", { maximumFractionDigits: 4 })
    : "—";
}

function getSelectedIndex(items, selectedHour) {
  const retainedIndex = items.findIndex((item) => item.hour_start === selectedHour);
  if (retainedIndex >= 0) return retainedIndex;
  const forecastIndex = items.findIndex((item) => item.data_kind === "forecast");
  return forecastIndex >= 0 ? forecastIndex : items.length - 1;
}

export default function GasHeatmapPanel({ onClose, onFrameChange }) {
  const [substanceCode, setSubstanceCode] = useState("NO2");
  const [timeline, setTimeline] = useState([]);
  const [currentHour, setCurrentHour] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [frame, setFrame] = useState(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [error, setError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const loadedSubstanceRef = useRef(null);
  const selectedHourRef = useRef(null);
  const selectedItem = timeline[selectedIndex] ?? null;

  useEffect(() => {
    selectedHourRef.current = selectedItem?.hour_start ?? null;
  }, [selectedItem]);

  useEffect(() => {
    let active = true;
    const isSubstanceChange = loadedSubstanceRef.current !== substanceCode;
    setIsLoadingTimeline(true);
    setError("");
    if (isSubstanceChange) {
      setTimeline([]);
      setCurrentHour(null);
      setSelectedIndex(-1);
      setFrame(null);
      setIsLoadingFrame(false);
      onFrameChange(null);
    }
    fetchGasHeatmapTimeline(substanceCode)
      .then((response) => {
        if (!active) return;
        setTimeline(response.items);
        setCurrentHour(response.current_hour);
        loadedSubstanceRef.current = substanceCode;
        setSelectedIndex(getSelectedIndex(response.items, selectedHourRef.current));
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить ленту");
      })
      .finally(() => {
        if (active) setIsLoadingTimeline(false);
      });
    return () => { active = false; };
  }, [substanceCode, refreshCounter, onFrameChange]);

  useEffect(() => {
    if (!selectedItem) {
      return undefined;
    }
    let active = true;
    const requestTimer = window.setTimeout(() => {
      setIsLoadingFrame(true);
      setError("");
      fetchGasHeatmap(substanceCode, selectedItem.hour_start)
        .then((response) => {
          if (!active) return;
          setFrame(response);
          onFrameChange(response);
        })
        .catch((requestError) => {
          if (!active) return;
          setFrame(null);
          onFrameChange(null);
          setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить карту");
        })
        .finally(() => {
          if (active) setIsLoadingFrame(false);
        });
    }, 120);
    return () => {
      active = false;
      window.clearTimeout(requestTimer);
    };
  }, [selectedItem, substanceCode, onFrameChange]);

  const hasCells = (frame?.cells ?? []).some((cell) => Number.isFinite(cell.value));

  return (
    <ScrollablePanel className="stations-panel heatmap-panel">
      <div className="card-header">
        <div>
          <h2>Тепловая карта</h2>
          <p className="heatmap-subtitle">Концентрации газов, мг/м³</p>
        </div>
        <div className="card-header-actions">
          <button
            type="button"
            className="card-refresh-btn heatmap-refresh-btn"
            aria-label="Обновить тепловую карту"
            aria-busy={isLoadingTimeline || isLoadingFrame}
            disabled={isLoadingTimeline || isLoadingFrame}
            onClick={() => setRefreshCounter((value) => value + 1)}
          >
            <RefreshCw
              className={isLoadingTimeline || isLoadingFrame ? "heatmap-refresh-icon-loading" : undefined}
              size={16}
              aria-hidden="true"
            />
          </button>
          <button type="button" className="card-close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <fieldset className="heatmap-gas-options">
        <legend>Газ</legend>
        <div role="radiogroup" aria-label="Газ для тепловой карты">
          {GASES.map((gas) => (
            <label key={gas} className={substanceCode === gas ? "heatmap-gas-option-selected" : ""}>
              <input
                type="radio"
                name="heatmap-gas"
                value={gas}
                checked={substanceCode === gas}
                onChange={() => setSubstanceCode(gas)}
              />
              <span>{gas}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!!timeline.length && (
        <HeatmapTimeline
          items={timeline}
          selectedIndex={selectedIndex}
          currentHour={currentHour}
          onSelect={setSelectedIndex}
        />
      )}

      {error && <p className="station-card-error">{error}</p>}
      {!isLoadingTimeline && !timeline.length && !error && <p className="station-card-hint">Для выбранного газа пока нет часовых данных.</p>}

      {frame && (
        <section className="heatmap-summary">
          <div><span>Станций</span><strong>{frame.source_station_count}</strong></div>
          {hasCells && (
            <div className="heatmap-legend-block">
              <span>Диапазон</span><div className="heatmap-legend" />
              <div className="heatmap-legend-labels"><span>{formatValue(GAS_HEATMAP_MIN_VALUE)}</span><span>{formatValue(GAS_HEATMAP_MAX_VALUE)}</span></div>
            </div>
          )}
          {frame.data_kind === "forecast" && frame.generated_at && (
            <small>Прогноз рассчитан {formatHour(frame.generated_at)}</small>
          )}
        </section>
      )}
    </ScrollablePanel>
  );
}

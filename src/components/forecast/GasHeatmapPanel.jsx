import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { fetchGasHeatmap, fetchGasHeatmapTimeline } from "../../api/gasForecasts";
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

export default function GasHeatmapPanel({ onClose, onFrameChange }) {
  const [substanceCode, setSubstanceCode] = useState("NO2");
  const [timeline, setTimeline] = useState([]);
  const [currentHour, setCurrentHour] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [frame, setFrame] = useState(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoadingTimeline(true);
    setError("");
    setTimeline([]);
    setCurrentHour(null);
    setSelectedIndex(-1);
    setFrame(null);
    setIsLoadingFrame(false);
    onFrameChange(null);
    fetchGasHeatmapTimeline(substanceCode)
      .then((response) => {
        if (!active) return;
        setTimeline(response.items);
        setCurrentHour(response.current_hour);
        const forecastIndex = response.items.findIndex((item) => item.data_kind === "forecast");
        setSelectedIndex(forecastIndex >= 0 ? forecastIndex : response.items.length - 1);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить ленту");
      })
      .finally(() => {
        if (active) setIsLoadingTimeline(false);
      });
    return () => { active = false; };
  }, [substanceCode, onFrameChange]);

  const selectedItem = timeline[selectedIndex] ?? null;

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

  const range = useMemo(() => {
    const values = (frame?.points ?? []).map((point) => point.value).filter(Number.isFinite);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  }, [frame]);

  return (
    <ScrollablePanel className="stations-panel heatmap-panel">
      <div className="card-header">
        <div>
          <h2>Тепловая карта</h2>
          <p className="heatmap-subtitle">Концентрации газов, мг/м³</p>
        </div>
        <div className="card-header-actions">
          <span
            className={`heatmap-loading-indicator${isLoadingTimeline || isLoadingFrame ? " heatmap-loading-indicator-active" : ""}`}
            title="Обновление данных"
            aria-label={isLoadingTimeline || isLoadingFrame ? "Обновление данных" : undefined}
          >
            {(isLoadingTimeline || isLoadingFrame) && <LoaderCircle className="spin" size={17} />}
          </span>
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
          <div><span>Станций</span><strong>{frame.points.filter((point) => Number.isFinite(point.value)).length}</strong></div>
          {range && (
            <div className="heatmap-legend-block">
              <span>Диапазон</span><div className="heatmap-legend" />
              <div className="heatmap-legend-labels"><span>{formatValue(range.min)}</span><span>{formatValue(range.max)}</span></div>
            </div>
          )}
          {frame.generated_at && <small>Прогноз рассчитан {formatHour(frame.generated_at)}</small>}
        </section>
      )}
    </ScrollablePanel>
  );
}

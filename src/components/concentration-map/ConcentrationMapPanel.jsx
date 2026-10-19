import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import {
  fetchConcentrationMap,
  fetchConcentrationMapSubstances,
  fetchConcentrationMapTimeline,
} from "../../api/concentrationMap";
import {
  CONCENTRATION_MAP_MIN_VALUE,
  getConcentrationMapMaxValue,
} from "../../domain/concentrationMap";
import PanelCollapseButton from "../layout/PanelCollapseButton";
import ScrollablePanel from "../layout/ScrollablePanel";
import ConcentrationMapTimeline from "./ConcentrationMapTimeline";


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

function getSelectedIndex(items, selectedHour, currentHour) {
  const retainedIndex = items.findIndex((item) => item.hour_start === selectedHour);
  if (retainedIndex >= 0) return retainedIndex;
  const currentIndex = items.findIndex((item) => new Date(item.hour_start) >= new Date(currentHour));
  return currentIndex >= 0 ? currentIndex : items.length - 1;
}

export default function ConcentrationMapPanel({ onClose, onFrameChange, autoRefreshCounter }) {
  const [substances, setSubstances] = useState([]);
  const [substanceCode, setSubstanceCode] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [currentHour, setCurrentHour] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [frame, setFrame] = useState(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [isLoadingSubstances, setIsLoadingSubstances] = useState(true);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [error, setError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const loadedSubstanceRef = useRef(null);
  const selectedHourRef = useRef(null);
  const selectedItem = timeline[selectedIndex] ?? null;

  useEffect(() => {
    selectedHourRef.current = selectedItem?.hour_start ?? null;
  }, [selectedItem]);

  useEffect(() => {
    let active = true;
    setIsLoadingSubstances(true);
    setError("");
    fetchConcentrationMapSubstances()
      .then((response) => {
        if (!active) return;
        setSubstances(response.items);
        setSubstanceCode((current) => (
          response.items.includes(current) ? current : ""
        ));
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить доступные газы");
        }
      })
      .finally(() => {
        if (active) setIsLoadingSubstances(false);
      });
    return () => { active = false; };
  }, [refreshCounter]);

  useEffect(() => {
    if (!substanceCode) {
      setIsLoadingTimeline(false);
      setTimeline([]);
      setCurrentHour(null);
      setSelectedIndex(-1);
      setFrame(null);
      onFrameChange(null);
      return undefined;
    }
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
    fetchConcentrationMapTimeline(substanceCode)
      .then((response) => {
        if (!active) return;
        setTimeline(response.items);
        setCurrentHour(response.current_hour);
        loadedSubstanceRef.current = substanceCode;
        setSelectedIndex(getSelectedIndex(response.items, selectedHourRef.current, response.current_hour));
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить ленту");
      })
      .finally(() => {
        if (active) setIsLoadingTimeline(false);
      });
    return () => { active = false; };
  }, [substanceCode, refreshCounter, autoRefreshCounter, onFrameChange]);

  useEffect(() => {
    if (!selectedItem) {
      return undefined;
    }
    let active = true;
    setFrame(null);
    onFrameChange(null);
    const requestTimer = window.setTimeout(() => {
      setIsLoadingFrame(true);
      setError("");
      fetchConcentrationMap(substanceCode, selectedItem.hour_start)
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

  const hasCells = frame?.cell_count > 0;
  const concentrationMapMaxValue = getConcentrationMapMaxValue(frame);

  return (
    <ScrollablePanel className={`stations-panel concentration-map-panel${isCollapsed ? " panel-collapsed" : ""}`}>
      <div className="card-header">
        <div>
          <h2>Карта концентраций</h2>
        </div>
        <div className="card-header-actions">
          <button
            type="button"
            className="card-refresh-btn concentration-map-refresh-btn"
            aria-label="Обновить карту концентраций"
            aria-busy={isLoadingSubstances || isLoadingTimeline || isLoadingFrame}
            disabled={isLoadingSubstances || isLoadingTimeline || isLoadingFrame}
            onClick={() => setRefreshCounter((value) => value + 1)}
          >
            <RefreshCw
              className={isLoadingSubstances || isLoadingTimeline || isLoadingFrame ? "concentration-map-refresh-icon-loading" : undefined}
              size={16}
              aria-hidden="true"
            />
          </button>
          <PanelCollapseButton
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed((value) => !value)}
          />
          <button
            type="button"
            className="card-close-btn"
            onClick={() => {
              setIsCollapsed(false);
              onClose();
            }}
            aria-label="Закрыть"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <fieldset className="concentration-map-gas-options">
        <legend>Газ</legend>
        <div role="radiogroup" aria-label="Газ для карты концентраций">
          {substances.map((gas) => (
            <label key={gas} className={substanceCode === gas ? "concentration-map-gas-option-selected" : ""}>
              <input
                type="radio"
                name="concentration-map-gas"
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
        <ConcentrationMapTimeline
          items={timeline}
          selectedIndex={selectedIndex}
          currentHour={currentHour}
          onSelect={setSelectedIndex}
        />
      )}

      {error && <p className="station-card-error">{error}</p>}
      {!isLoadingSubstances && !substances.length && !error && (
        <p className="station-card-hint">Нет доступных для прогноза газов.</p>
      )}
      {!isLoadingTimeline && !!substanceCode && !timeline.length && !error && (
        <p className="station-card-hint">Для выбранного газа пока нет часовых данных.</p>
      )}

      {frame && (
        <section className="concentration-map-summary">
          <div><span>Станций</span><strong>{frame.source_station_count}</strong></div>
          {hasCells && (
            <div className="concentration-map-legend-block">
              <span>Диапазон, мг/м³</span><div className="concentration-map-legend" />
              <div className="concentration-map-legend-labels"><span>{formatValue(CONCENTRATION_MAP_MIN_VALUE)}</span><span>{formatValue(concentrationMapMaxValue)}</span></div>
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

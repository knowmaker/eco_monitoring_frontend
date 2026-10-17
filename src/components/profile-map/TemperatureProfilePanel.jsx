import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import { fetchTemperatureMap } from "../../api/temperatureMap";
import {
  TEMPERATURE_PROFILE_COLORS,
  TEMPERATURE_PROFILE_RADIUS_METERS,
} from "../../domain/temperatureProfile";
import { toIsoDay } from "../../lib/date";
import PanelCollapseButton from "../layout/PanelCollapseButton";
import ScrollablePanel from "../layout/ScrollablePanel";


const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatValue(value, suffix, digits = 1) {
  return Number.isFinite(value)
    ? `${value.toLocaleString("ru-RU", { maximumFractionDigits: digits })} ${suffix}`
    : "-";
}

function hourKey(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }
  return `${toIsoDay(value)}T${String(value.getHours()).padStart(2, "0")}:00:00`;
}

function updateDate(value, dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Date(year, month - 1, day, value?.getHours() ?? 0);
}

export default function TemperatureProfilePanel({ onClose, onFrameChange }) {
  const [selectedHour, setSelectedHour] = useState(null);
  const [frame, setFrame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const loadedHourRef = useRef(null);

  useEffect(() => {
    const selectedKey = hourKey(selectedHour);
    if (selectedKey && selectedKey === loadedHourRef.current) {
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    setError("");
    fetchTemperatureMap(selectedHour)
      .then((response) => {
        if (!active) {
          return;
        }
        const responseHour = new Date(response.hour_start);
        loadedHourRef.current = hourKey(responseHour);
        setSelectedHour(responseHour);
        setFrame(response);
        onFrameChange(response);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setFrame(null);
        onFrameChange(null);
        setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить профили");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedHour, refreshCounter, onFrameChange]);

  const shiftHour = (delta) => {
    if (!selectedHour) {
      return;
    }
    const nextHour = new Date(selectedHour);
    nextHour.setHours(nextHour.getHours() + delta);
    setSelectedHour(nextHour);
  };

  const legendBackground = `linear-gradient(90deg, ${TEMPERATURE_PROFILE_COLORS.join(", ")})`;

  return (
    <ScrollablePanel className={`stations-panel temperature-profile-panel${isCollapsed ? " panel-collapsed" : ""}`}>
      <div className="card-header">
        <h2>Температурный профиль</h2>
        <div className="card-header-actions">
          <button
            type="button"
            className="card-refresh-btn"
            disabled={isLoading}
            aria-label="Обновить температурные профили"
            onClick={() => {
              loadedHourRef.current = null;
              setRefreshCounter((value) => value + 1);
            }}
          >
            <RefreshCw className={isLoading ? "profile-refresh-loading" : undefined} size={16} aria-hidden="true" />
          </button>
          <PanelCollapseButton
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed((value) => !value)}
          />
          <button
            type="button"
            className="card-close-btn"
            aria-label="Закрыть"
            onClick={() => {
              setIsCollapsed(false);
              onClose();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="profile-period-controls">
        <button type="button" aria-label="Предыдущий час" disabled={!selectedHour} onClick={() => shiftHour(-1)}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <input
          type="date"
          aria-label="Дата профиля"
          value={selectedHour ? toIsoDay(selectedHour) : ""}
          onChange={(event) => setSelectedHour((current) => updateDate(current, event.target.value))}
        />
        <select
          aria-label="Час профиля"
          value={selectedHour?.getHours() ?? 0}
          disabled={!selectedHour}
          onChange={(event) => {
            const nextHour = new Date(selectedHour);
            nextHour.setHours(Number(event.target.value));
            setSelectedHour(nextHour);
          }}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}:00-{String(hour).padStart(2, "0")}:59
            </option>
          ))}
        </select>
        <button type="button" aria-label="Следующий час" disabled={!selectedHour} onClick={() => shiftHour(1)}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {error && <p className="station-card-error">{error}</p>}
      {!isLoading && frame && frame.station_count === 0 && !error && (
        <p className="station-card-hint">За выбранный час профили отсутствуют.</p>
      )}

      {frame && frame.station_count > 0 && (
        <section className="profile-map-summary">
          <div><span>Станций</span><strong>{frame.station_count}</strong></div>
          <div>
            <span>Радиус цилиндра</span>
            <strong>{formatValue(TEMPERATURE_PROFILE_RADIUS_METERS / 1000, "км", 0)}</strong>
          </div>
          <div className="profile-map-legend-block">
            <span>Температура, °C</span>
            <div className="profile-map-legend" style={{ background: legendBackground }} />
            <div className="profile-map-legend-values">
              <span>{formatValue(frame.min_temperature, "°C")}</span>
              <span>{formatValue(frame.max_temperature, "°C")}</span>
            </div>
          </div>
        </section>
      )}
    </ScrollablePanel>
  );
}

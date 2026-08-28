import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { downloadAggregatesExport } from "../lib/api";

const DEVICE_TYPE_OPTIONS = [
  { key: "gas", label: "Газ" },
  { key: "dust", label: "Пыль" },
  { key: "meteo", label: "Метео" },
  { key: "ivtm", label: "ИВТМ" },
  { key: "profile", label: "Профиль" },
];

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toDateInputValue(date)}T${hours}:${minutes}`;
}

function getPostTitle(post) {
  return post.name || post.serial;
}

export default function ExportAggregatesCard({ monitoringPosts, isAuthenticated, onLoginClick }) {
  const now = useMemo(() => new Date(), []);
  const startOfDay = useMemo(() => {
    const value = new Date(now);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [now]);

  const [selectedStationIds, setSelectedStationIds] = useState([]);
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState(DEVICE_TYPE_OPTIONS.map((item) => item.key));
  const [aggregation, setAggregation] = useState("hourly");
  const [startDate, setStartDate] = useState(toDateInputValue(now));
  const [endDate, setEndDate] = useState(toDateInputValue(now));
  const [startDateTime, setStartDateTime] = useState(toDateTimeInputValue(startOfDay));
  const [endDateTime, setEndDateTime] = useState(toDateTimeInputValue(now));
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const hasStations = monitoringPosts.length > 0;
  const stationIds = monitoringPosts.map((post) => post.id);
  const areAllStationsSelected =
    stationIds.length > 0 && stationIds.every((id) => selectedStationIds.includes(id));
  const canSubmit =
    isAuthenticated &&
    selectedDeviceTypes.length > 0 &&
    selectedStationIds.length > 0 &&
    (aggregation === "hourly" ? startDateTime && endDateTime : startDate && endDate);

  useEffect(() => {
    setSelectedStationIds((current) => {
      const availableIds = new Set(stationIds);
      const next = current.filter((id) => availableIds.has(id));
      return next.length ? next : stationIds;
    });
  }, [monitoringPosts]);

  const toggleDeviceType = (deviceType) => {
    setSelectedDeviceTypes((current) =>
      current.includes(deviceType)
        ? current.filter((item) => item !== deviceType)
        : [...current, deviceType]
    );
  };

  const toggleStation = (stationId) => {
    setSelectedStationIds((current) =>
      current.includes(stationId)
        ? current.filter((item) => item !== stationId)
        : [...current, stationId]
    );
  };

  const toggleStations = () => {
    setSelectedStationIds((current) => {
      if (areAllStationsSelected) {
        return [];
      }
      return stationIds;
    });
  };

  const handleExport = async () => {
    setExportError("");
    if (!canSubmit) {
      setExportError("Заполните параметры экспорта.");
      return;
    }

    setIsExporting(true);
    try {
      await downloadAggregatesExport({
        station_ids: selectedStationIds,
        device_types: selectedDeviceTypes,
        aggregation,
        start: aggregation === "hourly" ? startDateTime : startDate,
        end: aggregation === "hourly" ? endDateTime : endDate,
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Не удалось экспортировать данные");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="export-card-body">
        <div className="station-card-error">
          Для экспорта данных необходимо
          <button type="button" className="export-inline-action" onClick={onLoginClick}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="export-card-body">
      <section className="export-section">
        <h3>Станции</h3>
        {hasStations ? (
          <div className="export-check-list export-station-list">
            <label className="export-check-row">
              <input
                type="checkbox"
                checked={areAllStationsSelected}
                onChange={toggleStations}
              />
              <span>(Выделить все)</span>
            </label>
            {monitoringPosts.map((post) => (
              <label key={post.id} className="export-check-row">
                <input
                  type="checkbox"
                  checked={selectedStationIds.includes(post.id)}
                  onChange={() => toggleStation(post.id)}
                />
                <span>{getPostTitle(post)}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="station-card-hint">Нет доступных станций.</p>
        )}
      </section>

      <section className="export-section">
        <h3>Приборы</h3>
        <div className="export-check-list export-check-list-compact">
          {DEVICE_TYPE_OPTIONS.map((item) => (
            <label key={item.key} className="export-check-row">
              <input
                type="checkbox"
                checked={selectedDeviceTypes.includes(item.key)}
                onChange={() => toggleDeviceType(item.key)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="export-section">
        <h3>Агрегация</h3>
        <div className="export-segmented">
          <button
            type="button"
            className={aggregation === "hourly" ? "export-segment-active" : ""}
            onClick={() => setAggregation("hourly")}
          >
            Часовая
          </button>
          <button
            type="button"
            className={aggregation === "daily" ? "export-segment-active" : ""}
            onClick={() => setAggregation("daily")}
          >
            Дневная
          </button>
        </div>
      </section>

      <section className="export-section">
        <h3>Период</h3>
        <div className="export-date-grid">
          <label>
            <span>Начало</span>
            <input
              type={aggregation === "hourly" ? "datetime-local" : "date"}
              value={aggregation === "hourly" ? startDateTime : startDate}
              onChange={(event) =>
                aggregation === "hourly" ? setStartDateTime(event.target.value) : setStartDate(event.target.value)
              }
            />
          </label>
          <label>
            <span>Конец</span>
            <input
              type={aggregation === "hourly" ? "datetime-local" : "date"}
              value={aggregation === "hourly" ? endDateTime : endDate}
              onChange={(event) =>
                aggregation === "hourly" ? setEndDateTime(event.target.value) : setEndDate(event.target.value)
              }
            />
          </label>
        </div>
      </section>

      {exportError && <p className="station-card-error">{exportError}</p>}

      <button type="button" className="btn btn-secondary export-submit" disabled={!canSubmit || isExporting} onClick={handleExport}>
        <Download size={16} aria-hidden="true" />
        <span>{isExporting ? "Формирование..." : "Скачать XLSX"}</span>
      </button>
    </div>
  );
}

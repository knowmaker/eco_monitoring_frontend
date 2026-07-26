import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import { fetchRawMqttPayload } from "../lib/api";

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

function getPacketTimestamp(packet) {
  const timestamp = Number(packet?.timeStamp);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function formatPacketTime(packet) {
  const timestamp = getPacketTimestamp(packet);
  if (timestamp === null) {
    return "без timeStamp";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function RawMqttPayloadCard({ monitoringPostId, onClose }) {
  const [day, setDay] = useState(new Date());
  const [limit, setLimit] = useState(25);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [records, setRecords] = useState([]);

  const dateInputValue = toIsoDay(day);

  useEffect(() => {
    if (!monitoringPostId) {
      setRecords([]);
      setErrorText("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorText("");

    fetchRawMqttPayload(monitoringPostId, day, limit)
      .then((payload) => {
        if (!cancelled) {
          setRecords(payload.records || []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Не удалось загрузить сырые данные");
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringPostId, day, limit, reloadToken]);

  const recordCountText = useMemo(() => {
    if (isLoading) {
      return "Загрузка...";
    }
    return `Записей: ${records.length}`;
  }, [isLoading, records.length]);

  const handleDateInputChange = (value) => {
    const nextDay = parseIsoDay(value);
    if (nextDay) {
      setDay(nextDay);
    }
  };

  return (
    <aside className="readings-card raw-data-card">
      <div className="card-header">
        <h2>Сырые данные</h2>
        <button type="button" className="card-close-btn" aria-label="Закрыть сырые данные" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="readings-toolbar raw-data-toolbar">
        <div>
          <div className="readings-type">Пакеты станции</div>
          <div className="raw-data-count">{recordCountText}</div>
        </div>
        <div className="period-controls">
          <div className="day-switcher">
            <button type="button" aria-label="Предыдущий день" onClick={() => setDay((prev) => shiftDay(prev, -1))}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <input
              type="date"
              aria-label="Выбрать дату сырых данных"
              value={dateInputValue}
              onChange={(event) => handleDateInputChange(event.target.value)}
            />
            <button type="button" aria-label="Следующий день" onClick={() => setDay((prev) => shiftDay(prev, 1))}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <select
            className="raw-limit-select"
            aria-label="Лимит сырых записей"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
          <button
            type="button"
            className="raw-refresh-btn"
            aria-label="Обновить сырые данные"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isLoading && <p className="station-card-hint">Загрузка сырых данных...</p>}
      {!isLoading && errorText && <p className="station-card-error">{errorText}</p>}
      {!isLoading && !errorText && !records.length && <p className="station-card-hint">Нет данных за указанную дату</p>}

      {!isLoading && !errorText && records.length > 0 && (
        <div className="raw-records-list">
          {records.map((record, index) => (
            <article className="raw-record" key={`${record.packet?.timeStamp ?? "packet"}-${index}`}>
              <div className="raw-record-header">
                <span>Пакет {index + 1}</span>
                <span className="raw-record-time">{formatPacketTime(record.packet)}</span>
                <span className="raw-record-timestamp">{record.packet?.timeStamp ?? "timeStamp отсутствует"}</span>
              </div>
              <pre className="raw-json">{JSON.stringify(record.packet, null, 2)}</pre>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

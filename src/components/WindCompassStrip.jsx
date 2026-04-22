import { useMemo } from "react";

const EMPTY = "—";
const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function normalizeDegrees(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return ((value % 360) + 360) % 360;
}

function normalizeSpeed(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value < 0 ? 0 : value;
}

function toCardinal(degrees) {
  const normalized = normalizeDegrees(degrees);
  if (normalized === null) {
    return EMPTY;
  }
  const index = Math.round(normalized / 45) % CARDINALS.length;
  return CARDINALS[index];
}

export default function WindCompassStrip({ directionPoints, speedPoints }) {
  const directionByHour = useMemo(
    () => new Map((directionPoints || []).map((point) => [point.hour, point.value])),
    [directionPoints]
  );
  const speedByHour = useMemo(
    () => new Map((speedPoints || []).map((point) => [point.hour, point.value])),
    [speedPoints]
  );

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const direction = normalizeDegrees(directionByHour.get(hour));
        const speed = normalizeSpeed(speedByHour.get(hour));
        return {
          hour,
          direction,
          speed,
          cardinal: toCardinal(direction),
          directionText: direction === null ? EMPTY : `${Math.round(direction)} deg`,
          speedText: speed === null ? EMPTY : `${speed.toFixed(1)} m/s`,
        };
      }),
    [directionByHour, speedByHour]
  );

  const maxSpeed = hours.reduce((max, item) => (item.speed !== null && item.speed > max ? item.speed : max), 0);
  const hasValues = hours.some((item) => item.direction !== null || item.speed !== null);

  if (!hasValues) {
    return <div className="chart-empty">Нет данных за выбранные сутки.</div>;
  }

  return (
    <div className="wind-strip-wrap">
      <div className="wind-strip-help">Wind tab: arrow shows direction, bar length shows wind speed.</div>
      <div className="wind-strip">
        {hours.map((item) => (
          <div className="wind-strip-cell" key={item.hour}>
            <div className="wind-strip-hour">{String(item.hour).padStart(2, "0")}:00</div>
            <div className="wind-strip-arrow-box">
              {item.direction === null ? (
                <span className="wind-strip-empty">{EMPTY}</span>
              ) : (
                <span className="wind-strip-arrow" style={{ transform: `rotate(${item.direction}deg)` }}>
                  ↑
                </span>
              )}
            </div>
            <div className="wind-strip-dir">{item.cardinal}</div>
            <div className="wind-strip-value">{item.directionText}</div>
            <div className="wind-strip-speed-track">
              <div
                className="wind-strip-speed-fill"
                style={{
                  width:
                    item.speed === null || maxSpeed <= 0 ? "0%" : `${Math.max((item.speed / maxSpeed) * 100, 6)}%`,
                }}
              />
            </div>
            <div className="wind-strip-speed-value">{item.speedText}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

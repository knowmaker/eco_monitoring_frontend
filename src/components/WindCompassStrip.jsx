import { useMemo } from "react";

const EMPTY = "-";
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

function toArrowRotation(degrees) {
  const normalized = normalizeDegrees(degrees);
  return normalized === null ? 0 : (normalized + 180) % 360;
}

export default function WindCompassStrip({
  directionPoints,
  speedPoints,
  xKey = "hour",
  xValues,
  labelFormatter,
  emptyText = "Нет данных за выбранный период.",
}) {
  const directionByAxisValue = useMemo(
    () => new Map((directionPoints || []).map((point) => [point[xKey], point.value])),
    [directionPoints, xKey]
  );
  const speedByAxisValue = useMemo(
    () => new Map((speedPoints || []).map((point) => [point[xKey], point.value])),
    [speedPoints, xKey]
  );

  const axisValues = useMemo(
    () => (xValues?.length ? xValues : Array.from({ length: 24 }, (_, hour) => hour)),
    [xValues]
  );

  const items = useMemo(
    () =>
      axisValues.map((axisValue) => {
        const direction = normalizeDegrees(directionByAxisValue.get(axisValue));
        const speed = normalizeSpeed(speedByAxisValue.get(axisValue));
        return {
          axisValue,
          direction,
          speed,
          label: labelFormatter ? labelFormatter(axisValue) : `${String(axisValue).padStart(2, "0")}:00`,
          cardinal: toCardinal(direction),
          arrowRotation: toArrowRotation(direction),
          directionText: direction === null ? EMPTY : `${Math.round(direction)}°`,
          speedText: speed === null ? EMPTY : `${speed.toFixed(1)} м/с`,
        };
      }),
    [axisValues, directionByAxisValue, speedByAxisValue, labelFormatter]
  );

  const maxSpeed = items.reduce((max, item) => (item.speed !== null && item.speed > max ? item.speed : max), 0);
  const hasValues = items.some((item) => item.direction !== null || item.speed !== null);

  if (!hasValues) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="wind-strip-wrap">
      <div className="wind-strip">
        {items.map((item) => (
          <div className="wind-strip-cell" key={item.axisValue}>
            <div className="wind-strip-hour">{item.label}</div>
            <div className="wind-strip-arrow-box">
              {item.direction === null ? (
                <span className="wind-strip-empty">{EMPTY}</span>
              ) : (
                <span className="wind-strip-arrow" style={{ transform: `rotate(${item.arrowRotation}deg)` }}>
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

import { useMemo } from "react";

const EMPTY = "—";
const CARDINALS = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];

function normalizeDegrees(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return ((value % 360) + 360) % 360;
}

function toCardinal(degrees) {
  const normalized = normalizeDegrees(degrees);
  if (normalized === null) {
    return EMPTY;
  }
  const index = Math.round(normalized / 45) % CARDINALS.length;
  return CARDINALS[index];
}

export default function WindCompassStrip({ points }) {
  const byHour = useMemo(() => {
    return new Map((points || []).map((point) => [point.hour, point.value]));
  }, [points]);

  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const value = byHour.get(hour);
      const normalized = normalizeDegrees(value);
      return {
        hour,
        value: normalized,
        text: normalized === null ? EMPTY : `${Math.round(normalized)}°`,
        direction: toCardinal(normalized),
      };
    });
  }, [byHour]);

  const hasValues = hours.some((item) => item.value !== null);
  if (!hasValues) {
    return <div className="chart-empty">Нет данных за выбранные сутки.</div>;
  }

  return (
    <div className="wind-strip-wrap">
      <div className="wind-strip-help">Компас-лента: стрелка показывает направление, куда дует ветер.</div>
      <div className="wind-strip">
        {hours.map((item) => (
          <div className="wind-strip-cell" key={item.hour}>
            <div className="wind-strip-hour">{String(item.hour).padStart(2, "0")}:00</div>
            <div className="wind-strip-arrow-box">
              {item.value === null ? (
                <span className="wind-strip-empty">{EMPTY}</span>
              ) : (
                <span className="wind-strip-arrow" style={{ transform: `rotate(${item.value}deg)` }}>
                  ↑
                </span>
              )}
            </div>
            <div className="wind-strip-dir">{item.direction}</div>
            <div className="wind-strip-value">{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

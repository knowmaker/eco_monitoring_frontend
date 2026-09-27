import { ChevronLeft, ChevronRight } from "lucide-react";


const VISIBLE_HOURS = 5;

function formatSelectedHour(value) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimelineHour(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimelineDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getVisibleRange(items, selectedIndex) {
  const halfWindow = Math.floor(VISIBLE_HOURS / 2);
  const maxStart = Math.max(items.length - VISIBLE_HOURS, 0);
  const start = Math.min(Math.max(selectedIndex - halfWindow, 0), maxStart);
  return { start, items: items.slice(start, start + VISIBLE_HOURS) };
}

export default function HeatmapTimeline({
  items,
  selectedIndex,
  currentHour,
  onSelect,
}) {
  const selectedItem = items[selectedIndex] ?? null;
  const visibleRange = getVisibleRange(items, selectedIndex);
  const firstFutureIndex = currentHour
    ? items.findIndex((item) => new Date(item.hour_start) >= new Date(currentHour))
    : -1;

  return (
    <section className="heatmap-time-card">
      <div className="heatmap-time-heading">
        <span className={`heatmap-kind heatmap-kind-${selectedItem?.data_kind ?? "none"}`}>
          {selectedItem?.data_kind === "forecast" ? "Прогноз" : "Наблюдение"}
        </span>
        <strong>{formatSelectedHour(selectedItem?.hour_start)}</strong>
      </div>

      <div className="heatmap-timeline">
        <button
          type="button"
          className="heatmap-timeline-arrow"
          disabled={selectedIndex <= 0}
          onClick={() => onSelect(selectedIndex - 1)}
          aria-label="Предыдущий час"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="heatmap-timeline-hours">
          {visibleRange.items.map((item, visibleIndex) => {
            const itemIndex = visibleRange.start + visibleIndex;
            const isSelected = itemIndex === selectedIndex;
            const isCurrentBoundary = itemIndex === firstFutureIndex;
            return (
              <button
                type="button"
                key={item.hour_start}
                className={[
                  "heatmap-timeline-hour",
                  isSelected ? "heatmap-timeline-hour-selected" : "",
                  item.data_kind === "forecast" ? "heatmap-timeline-hour-forecast" : "",
                  isCurrentBoundary ? "heatmap-timeline-hour-current" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => onSelect(itemIndex)}
                aria-pressed={isSelected}
              >
                {isCurrentBoundary && <span className="heatmap-timeline-now">Сейчас</span>}
                <span>{formatTimelineHour(item.hour_start)}</span>
                <small>{formatTimelineDate(item.hour_start)}</small>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="heatmap-timeline-arrow"
          disabled={selectedIndex < 0 || selectedIndex >= items.length - 1}
          onClick={() => onSelect(selectedIndex + 1)}
          aria-label="Следующий час"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="heatmap-timeline-jump">
        <span>{formatTimelineDate(items[0]?.hour_start)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(items.length - 1, 0)}
          value={Math.max(selectedIndex, 0)}
          onChange={(event) => onSelect(Number(event.target.value))}
          aria-label="Быстрый переход по временной ленте"
        />
        <span>{formatTimelineDate(items.at(-1)?.hour_start)}</span>
      </div>
    </section>
  );
}

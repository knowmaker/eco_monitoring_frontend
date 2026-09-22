import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ReadingsPeriodToolbar({
  viewMode,
  dateInputType,
  dateInputValue,
  maxDateInputValue,
  isNextPeriodDisabled,
  onViewModeChange,
  onShiftPeriod,
  onDateInputChange,
}) {
  return (
    <div className="readings-toolbar readings-period-toolbar">
      <div className="readings-period-label">Период агрегации</div>
      <div className="period-controls">
        <div className="period-switcher">
          <button
            type="button"
            className={`period-tab${viewMode === "day" ? " period-tab-active" : ""}`}
            onClick={() => onViewModeChange("day")}
          >
            День
          </button>
          <button
            type="button"
            className={`period-tab${viewMode === "month" ? " period-tab-active" : ""}`}
            onClick={() => onViewModeChange("month")}
          >
            Месяц
          </button>
        </div>
        <div className="day-switcher">
          <button type="button" onClick={() => onShiftPeriod(-1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <input
            type={dateInputType}
            value={dateInputValue}
            max={maxDateInputValue}
            onChange={(event) => onDateInputChange(event.target.value)}
          />
          <button type="button" disabled={isNextPeriodDisabled} onClick={() => onShiftPeriod(1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

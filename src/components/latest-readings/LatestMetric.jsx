import { formatLatestValue, getLimitStatus, getLimitTitle } from "./latestReadingsFormatters";

export default function LatestMetric({ label, value, unit, precision, displayValue, limit }) {
  const limitStatus = getLimitStatus(value, limit);

  return (
    <div className={`latest-metric latest-metric-${limitStatus}`} title={getLimitTitle(limit)}>
      <span className="latest-metric-label">{label}</span>
      <span className="latest-metric-value">{displayValue ?? formatLatestValue(value, unit, precision)}</span>
    </div>
  );
}

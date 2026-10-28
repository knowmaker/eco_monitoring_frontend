import { formatLatestTime } from "./latestReadingsFormatters";

export default function LatestDeviceHeader({ title, timestampMs, timeMode, unit }) {
  return (
    <h4>
      <span className="latest-device-heading">
        <span>{title}</span>
        {unit && <span className="latest-device-unit">· {unit}</span>}
      </span>
      <time>{formatLatestTime(timestampMs, timeMode)}</time>
    </h4>
  );
}

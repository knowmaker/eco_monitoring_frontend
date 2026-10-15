import { formatLatestTime } from "./latestReadingsFormatters";

export default function LatestDeviceHeader({ title, timestampMs, timeMode }) {
  return (
    <h4>
      <span>{title}</span>
      <time>{formatLatestTime(timestampMs, timeMode)}</time>
    </h4>
  );
}

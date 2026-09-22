import { formatLatestTime } from "./latestReadingsFormatters";

export default function LatestDeviceHeader({ title, bucketMs }) {
  return (
    <h4>
      <span>{title}</span>
      <time>{formatLatestTime(bucketMs)}</time>
    </h4>
  );
}

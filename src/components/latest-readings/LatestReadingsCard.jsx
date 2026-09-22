import { DEVICE_TYPE_ORDER } from "../../domain/devices";
import { renderLatestDeviceBlock } from "./LatestDeviceBlocks";
import useLatestReadings from "./useLatestReadings";

export default function LatestReadingsCard({ monitoringPostId, refreshCounter = 0 }) {
  const {
    latestReadings,
    isLoadingLatest,
    latestErrorText,
  } = useLatestReadings({ monitoringPostId, refreshCounter });

  return (
    <section className="latest-readings">
      <div className="latest-readings-header">
        <h3>Последние значения</h3>
      </div>

      {isLoadingLatest && <p className="station-card-hint">Загрузка последних показаний...</p>}
      {!isLoadingLatest && latestErrorText && <p className="station-card-error">{latestErrorText}</p>}
      {!isLoadingLatest && !latestErrorText && latestReadings?.bucket_ms !== null && latestReadings && (
        <div className="latest-readings-grid">
          {DEVICE_TYPE_ORDER.map((deviceType) => renderLatestDeviceBlock(deviceType, latestReadings))}
        </div>
      )}
    </section>
  );
}

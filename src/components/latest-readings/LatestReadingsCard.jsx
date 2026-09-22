import { DEVICE_TYPE_ORDER } from "../../domain/devices";
import { renderLatestDeviceBlock } from "./LatestDeviceBlocks";

export default function LatestReadingsCard({
  latestReadings,
  isLoadingLatest = false,
  latestErrorText = "",
  useGasAbsoluteValues = true,
}) {
  return (
    <section className="latest-readings">
      <div className="latest-readings-header">
        <h3>Последние значения</h3>
      </div>

      {isLoadingLatest && <p className="station-card-hint">Загрузка последних показаний...</p>}
      {!isLoadingLatest && latestErrorText && <p className="station-card-error">{latestErrorText}</p>}
      {!isLoadingLatest && !latestErrorText && latestReadings?.bucket_ms !== null && latestReadings && (
        <div className="latest-readings-grid">
          {DEVICE_TYPE_ORDER.map((deviceType) =>
            renderLatestDeviceBlock(deviceType, latestReadings, { useGasAbsoluteValues })
          )}
        </div>
      )}
    </section>
  );
}

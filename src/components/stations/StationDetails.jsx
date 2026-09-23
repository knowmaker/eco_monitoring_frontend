import { Database } from "lucide-react";

import { DEVICE_TYPE_LABELS } from "../../domain/devices";
import { formatCoordinates, getPostTitle, POST_TYPE_LABELS } from "../../domain/monitoringPosts";
import LatestReadingsCard from "../latest-readings/LatestReadingsCard";
import useLatestReadings from "../latest-readings/useLatestReadings";

const PLACEMENT_BADGES = {
  active: { label: "Активна", className: "station-placement-badge-active" },
  passive: { label: "Пассивна", className: "station-placement-badge-passive" },
  archived: { label: "В архиве", className: "station-placement-badge-archive" },
};

function getPlacementBadge(post) {
  return PLACEMENT_BADGES[post?.activity_status] ?? null;
}

export default function StationDetails({
  selectedMonitoringPost,
  selectedMonitoringPostId,
  isAdmin,
  isRawPacketsOpen,
  selectedDevices,
  selectedDeviceType,
  isReadingsCardOpen,
  isLoadingDetails,
  detailsError,
  refreshCounter,
  useGasAbsoluteValues = true,
  onOpenRawPackets,
  onSelectDeviceType,
}) {
  const {
    latestReadings,
    isLoadingLatest,
    latestErrorText,
  } = useLatestReadings({ monitoringPostId: selectedMonitoringPostId, refreshCounter });
  const placementBadge = getPlacementBadge(selectedMonitoringPost);

  return (
    <>
      <div className="station-grid">
        <div>
          <span className="station-grid-label">Название</span>
          <span className="station-title-row">
            <span className="station-grid-value">{getPostTitle(selectedMonitoringPost)}</span>
            {isAdmin && placementBadge && (
              <span className={`station-placement-badge ${placementBadge.className}`}>
                {placementBadge.label}
              </span>
            )}
          </span>
        </div>
        <div>
          <span className="station-grid-label">Тип поста</span>
          <span className="station-grid-value">
            {POST_TYPE_LABELS[selectedMonitoringPost?.post_type] ?? selectedMonitoringPost?.post_type ?? "-"}
          </span>
        </div>
        <div>
          <span className="station-grid-label">Координаты</span>
          <span className="station-grid-value">
            {formatCoordinates(selectedMonitoringPost?.latitude, selectedMonitoringPost?.longitude)}
          </span>
        </div>
      </div>
      {isAdmin && selectedMonitoringPost?.notes && (
        <div className="station-notes">
          <span className="station-grid-label">Заметки</span>
          <p>{selectedMonitoringPost.notes}</p>
        </div>
      )}
      {isAdmin && (
        <button
          type="button"
          className={`station-raw-action${isRawPacketsOpen ? " station-raw-action-active" : ""}`}
          onClick={onOpenRawPackets}
        >
          <Database size={15} aria-hidden="true" />
          <span>Сырые пакеты данных с брокера</span>
        </button>
      )}
      <LatestReadingsCard
        latestReadings={latestReadings}
        isLoadingLatest={isLoadingLatest}
        latestErrorText={latestErrorText}
        useGasAbsoluteValues={useGasAbsoluteValues}
      />

      {isLoadingDetails && <p className="station-card-hint">Загрузка данных станции...</p>}
      {!isLoadingDetails && detailsError && <p className="station-card-error">{detailsError}</p>}

      {!isLoadingDetails && !detailsError && (
        <section className="station-section station-devices-section">
          <h3>Исторические наблюдения</h3>
          {selectedDevices.length ? (
            <ul className="station-device-list">
              {selectedDevices.map((device) => (
                <li key={device.device_type} className="station-device-item">
                  <div className="station-device-row">
                    <button
                      type="button"
                      className={`station-device-button${
                        selectedDeviceType === device.device_type && isReadingsCardOpen
                          ? " station-device-button-active"
                          : ""
                      }`}
                      onClick={() => onSelectDeviceType(device.device_type)}
                    >
                      <span className="station-device-type">
                        {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                      </span>
                      <span className="station-device-name">{device.device_name || "Без имени"}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}
    </>
  );
}

import { X } from "lucide-react";

import StationEditForm from "./StationEditForm";
import StationTransferForm from "./StationTransferForm";
import ScrollablePanel from "../layout/ScrollablePanel";

export default function StationManagementPanel({
  mode,
  stationForm,
  stationSaveError,
  isSavingStation,
  transferForm,
  transferError,
  isTransferringStation,
  canTransferStation,
  canArchiveStation,
  onSaveStation,
  onStationFormChange,
  onStartTransfer,
  onArchiveStation,
  onSubmitTransfer,
  onTransferFormChange,
  onCancelTransfer,
  onClose,
}) {
  const isTransferMode = mode === "transfer";

  return (
    <ScrollablePanel className="readings-card station-management-card">
      <div className="card-header">
        <h2>{isTransferMode ? "Перенос станции" : "Редактирование станции"}</h2>
        <div className="card-header-actions">
          <button type="button" className="card-close-btn" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isTransferMode ? (
        <StationTransferForm
          transferForm={transferForm}
          transferError={transferError}
          isTransferringStation={isTransferringStation}
          onSubmit={onSubmitTransfer}
          onFormChange={onTransferFormChange}
          onCancel={onCancelTransfer}
        />
      ) : (
        <StationEditForm
          stationForm={stationForm}
          stationSaveError={stationSaveError}
          isSavingStation={isSavingStation}
          canTransferStation={canTransferStation}
          canArchiveStation={canArchiveStation}
          onSubmit={onSaveStation}
          onFormChange={onStationFormChange}
          onTransfer={onStartTransfer}
          onArchive={onArchiveStation}
          onCancel={onClose}
        />
      )}
    </ScrollablePanel>
  );
}

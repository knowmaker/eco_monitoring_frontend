import { X } from "lucide-react";

import StationEditForm from "./StationEditForm";
import StationTransferForm from "./StationTransferForm";

export default function StationManagementPanel({
  mode,
  stationForm,
  stationSaveError,
  isSavingStation,
  transferForm,
  transferError,
  isTransferringStation,
  canTransferStation,
  onSaveStation,
  onStationFormChange,
  onStartTransfer,
  onSubmitTransfer,
  onTransferFormChange,
  onCancelTransfer,
  onClose,
}) {
  const isTransferMode = mode === "transfer";

  return (
    <aside className="readings-card station-management-card">
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
          onSubmit={onSaveStation}
          onFormChange={onStationFormChange}
          onTransfer={onStartTransfer}
          onCancel={onClose}
        />
      )}
    </aside>
  );
}

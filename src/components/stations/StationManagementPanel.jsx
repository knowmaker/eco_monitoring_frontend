import { useState } from "react";
import { X } from "lucide-react";

import StationEditForm from "./StationEditForm";
import StationTransferForm from "./StationTransferForm";
import PanelCollapseButton from "../layout/PanelCollapseButton";
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ScrollablePanel
      className={`readings-card station-management-card${isCollapsed ? " panel-collapsed" : ""}`}
    >
      <div className="card-header">
        <h2>{isTransferMode ? "Перенос станции" : "Редактирование станции"}</h2>
        <div className="card-header-actions">
          <PanelCollapseButton
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed((value) => !value)}
          />
          <button
            type="button"
            className="card-close-btn"
            onClick={() => {
              setIsCollapsed(false);
              onClose();
            }}
          >
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

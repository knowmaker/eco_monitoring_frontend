import { X } from "lucide-react";

import ScrollablePanel from "../layout/ScrollablePanel";
import ExportAggregatesPanel from "./ExportAggregatesPanel";

export default function ExportPanel({ monitoringPosts, isAuthenticated, onLoginClick, onClose }) {
  return (
    <ScrollablePanel className="stations-panel export-panel">
      <div className="card-header">
        <h2>Экспорт данных</h2>
        <div className="card-header-actions">
          <button type="button" className="card-close-btn" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ExportAggregatesPanel
        monitoringPosts={monitoringPosts}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
      />
    </ScrollablePanel>
  );
}

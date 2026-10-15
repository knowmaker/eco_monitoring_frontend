import { useState } from "react";
import { X } from "lucide-react";

import PanelCollapseButton from "../layout/PanelCollapseButton";
import ScrollablePanel from "../layout/ScrollablePanel";
import ExportAggregatesPanel from "./ExportAggregatesPanel";

export default function ExportPanel({ monitoringPosts, isAuthenticated, onLoginClick, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ScrollablePanel className={`stations-panel export-panel${isCollapsed ? " panel-collapsed" : ""}`}>
      <div className="card-header">
        <h2>Экспорт данных</h2>
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

      <ExportAggregatesPanel
        monitoringPosts={monitoringPosts}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
      />
    </ScrollablePanel>
  );
}

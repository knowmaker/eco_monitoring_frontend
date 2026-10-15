import { ChevronDown, ChevronUp } from "lucide-react";

export default function PanelCollapseButton({ isCollapsed, onToggle }) {
  const label = isCollapsed ? "Развернуть окно" : "Свернуть окно";

  return (
    <button
      type="button"
      className="card-collapse-btn"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {isCollapsed ? (
        <ChevronDown size={16} aria-hidden="true" />
      ) : (
        <ChevronUp size={16} aria-hidden="true" />
      )}
    </button>
  );
}

import { Calculator, Download, List, TrendingUp } from "lucide-react";

export default function SideMenu({ activeMenuPanel, onStationsClick, onExportClick }) {
  return (
    <nav className={`side-menu${activeMenuPanel ? " side-menu-collapsed" : ""}`}>
      <button
        type="button"
        className={`side-menu-button${activeMenuPanel === "stations" ? " side-menu-button-active" : ""}`}
        onClick={onStationsClick}
      >
        <List size={18} aria-hidden="true" />
        <span>Станции мониторинга</span>
      </button>
      <button type="button" className="side-menu-button side-menu-button-disabled" disabled>
        <Calculator size={18} aria-hidden="true" />
        <span>Математические модели расчетов</span>
      </button>
      <button type="button" className="side-menu-button side-menu-button-disabled" disabled>
        <TrendingUp size={18} aria-hidden="true" />
        <span>Прогнозирование</span>
      </button>
      <button
        type="button"
        className={`side-menu-button${activeMenuPanel === "export" ? " side-menu-button-active" : ""}`}
        onClick={onExportClick}
      >
        <Download size={18} aria-hidden="true" />
        <span>Экспорт данных</span>
      </button>
    </nav>
  );
}

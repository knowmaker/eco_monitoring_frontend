import { Download, Layers3, List, Thermometer } from "lucide-react";

export default function SideMenu({
  activeMenuPanel,
  onStationsClick,
  onHeatmapClick,
  onTemperatureProfileClick,
  onExportClick,
}) {
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
      <button
        type="button"
        className={`side-menu-button${activeMenuPanel === "heatmap" ? " side-menu-button-active" : ""}`}
        onClick={onHeatmapClick}
      >
        <Layers3 size={18} aria-hidden="true" />
        <span>Тепловая карта</span>
      </button>
      <button
        type="button"
        className={`side-menu-button${activeMenuPanel === "temperature-profile" ? " side-menu-button-active" : ""}`}
        onClick={onTemperatureProfileClick}
      >
        <Thermometer size={18} aria-hidden="true" />
        <span>Температурный профиль</span>
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

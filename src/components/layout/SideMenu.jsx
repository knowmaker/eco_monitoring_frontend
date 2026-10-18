import { Download, Layers3, List, Thermometer } from "lucide-react";

export default function SideMenu({
  activeMenuPanel,
  onStationsClick,
  onConcentrationMapClick,
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
        className={`side-menu-button${activeMenuPanel === "concentration-map" ? " side-menu-button-active" : ""}`}
        onClick={onConcentrationMapClick}
      >
        <Layers3 size={18} aria-hidden="true" />
        <span>Карта концентраций</span>
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

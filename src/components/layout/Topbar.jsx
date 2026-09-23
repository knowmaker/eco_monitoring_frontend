import { useState } from "react";
import { BarChart3, ChevronUp, LogIn, LogOut, MapPin, User, UserPlus } from "lucide-react";

export default function Topbar({
  statusKind,
  statusText,
  stationStatusCounts,
  isAuthenticated,
  onProfileClick,
  onLogout,
  onLoginClick,
  onRegisterClick,
}) {
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const hasStationStats = Boolean(stationStatusCounts);

  return (
    <header className="topbar">
      <div className="brand-block">
        <img className="brand-logo" src="/favicon.png" alt="" aria-hidden="true" />
        <h1>ЭкоМониторинг МГТУ</h1>
        <div
          className={`topbar-status topbar-status-${statusKind}${
            isMobileStatsOpen ? " topbar-status-mobile-hidden" : ""
          }`}
          title={statusText}
        >
          <MapPin size={15} aria-hidden="true" />
          <span>{statusText}</span>
          {hasStationStats && (
            <button
              type="button"
              className="topbar-status-toggle"
              aria-label="Показать статистику станций"
              onClick={() => setIsMobileStatsOpen(true)}
            >
              <BarChart3 size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        {hasStationStats && (
          <div
            className={`topbar-station-stats${
              isMobileStatsOpen ? " topbar-station-stats-mobile-open" : ""
            }`}
            aria-label="Статистика станций по статусам"
          >
            <span className="topbar-station-stat topbar-station-stat-active">
              <span>Активна</span>
              <strong>{stationStatusCounts.active}</strong>
            </span>
            <span className="topbar-station-stat topbar-station-stat-passive">
              <span>Пассивна</span>
              <strong>{stationStatusCounts.passive}</strong>
            </span>
            <span className="topbar-station-stat topbar-station-stat-archived">
              <span>Архив</span>
              <strong>{stationStatusCounts.archived}</strong>
            </span>
            <button
              type="button"
              className="topbar-stats-toggle"
              aria-label="Свернуть статистику станций"
              onClick={() => setIsMobileStatsOpen(false)}
            >
              <ChevronUp size={13} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div className="topbar-actions">
        {isAuthenticated ? (
          <>
            <button className="btn btn-profile" type="button" onClick={onProfileClick}>
              <User size={16} aria-hidden="true" />
              <span className="btn-label">Профиль</span>
            </button>
            <button className="btn btn-danger" type="button" onClick={onLogout}>
              <LogOut size={16} aria-hidden="true" />
              <span className="btn-label">Выход</span>
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" type="button" onClick={onLoginClick}>
              <LogIn size={16} aria-hidden="true" />
              <span className="btn-label">Вход</span>
            </button>
            <button className="btn btn-primary" type="button" onClick={onRegisterClick}>
              <UserPlus size={16} aria-hidden="true" />
              <span className="btn-label">Регистрация</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

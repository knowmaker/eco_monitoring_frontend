import { LogIn, LogOut, MapPin, User, UserPlus } from "lucide-react";

export default function Topbar({
  statusKind,
  statusText,
  isAuthenticated,
  onProfileClick,
  onLogout,
  onLoginClick,
  onRegisterClick,
}) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <img className="brand-logo" src="/favicon.png" alt="" aria-hidden="true" />
        <h1>ЭкоМониторинг МГТУ</h1>
        <div className={`topbar-status topbar-status-${statusKind}`} title={statusText}>
          <MapPin size={15} aria-hidden="true" />
          <span>{statusText}</span>
        </div>
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

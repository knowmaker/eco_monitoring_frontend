import { useMemo, useState } from "react";
import { AUTH_TOKEN_STORAGE_KEY, loginByEmailPassword, registerByEmail } from "../lib/api";

export default function AuthModal({ mode, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const isRegister = mode === "register";
  const title = useMemo(() => (isRegister ? "Регистрация" : "Вход"), [isRegister]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setErrorText("");
    setSuccessText("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (isRegister) {
        const result = await registerByEmail(normalizedEmail);
        setSuccessText(result.message);
      } else {
        const result = await loginByEmailPassword(normalizedEmail, password);
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.accessToken);
        setSuccessText("Вход выполнен.");
        onAuthSuccess?.();
        setTimeout(() => onClose(), 220);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2>{title}</h2>
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {!isRegister && (
            <label>
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}

          {errorText ? <div className="form-message form-message-error">{errorText}</div> : null}
          {successText ? <div className="form-message form-message-success">{successText}</div> : null}

          <button
            className={`${isRegister ? "primary-btn" : "ghost-btn"} modal-submit`}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка..." : isRegister ? "Регистрация" : "Вход"}
          </button>
        </form>
      </div>
    </div>
  );
}

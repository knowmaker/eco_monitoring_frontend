import { useMemo, useState } from "react";
import { LogIn, Send, UserPlus } from "lucide-react";

import { loginByEmailPassword, registerByEmail } from "../../api";
import Dialog from "../ui/Dialog";

export default function AuthModal({ mode, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const isRegister = mode === "register";
  const title = useMemo(() => (isRegister ? "Регистрация" : "Вход"), [isRegister]);
  const SubmitIcon = isSubmitting ? Send : isRegister ? UserPlus : LogIn;

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
        setSuccessText("Вход выполнен.");
        onAuthSuccess?.(result);
        setTimeout(() => onClose(), 220);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      title={title}
      description={isRegister ? "Регистрация нового пользователя" : "Вход в систему экологического мониторинга"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <label>
          {isRegister ? "Email" : "Логин"}
          <input
            type={isRegister ? "email" : "text"}
            autoComplete={isRegister ? "email" : "username"}
            placeholder={isRegister ? "Введите email" : "Введите логин"}
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
          className={`btn ${isRegister ? "btn-primary" : "btn-secondary"} modal-submit`}
          type="submit"
          disabled={isSubmitting}
        >
          <SubmitIcon size={16} aria-hidden="true" />
          {isSubmitting ? "Отправка..." : isRegister ? "Регистрация" : "Вход"}
        </button>
      </form>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Save, User, X } from "lucide-react";

import { fetchCurrentUserProfile, updateCurrentUserProfile } from "../lib/api";

const emptyProfile = {
  last_name: "",
  first_name: "",
  middle_name: "",
};

export default function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorText("");

    fetchCurrentUserProfile()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setProfile({
          last_name: payload.last_name || "",
          first_name: payload.first_name || "",
          middle_name: payload.middle_name || "",
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Не удалось загрузить профиль");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorText("");
    setSuccessText("");

    try {
      const savedProfile = await updateCurrentUserProfile({
        last_name: profile.last_name.trim() || null,
        first_name: profile.first_name.trim() || null,
        middle_name: profile.middle_name.trim() || null,
      });
      setProfile({
        last_name: savedProfile.last_name || "",
        first_name: savedProfile.first_name || "",
        middle_name: savedProfile.middle_name || "",
      });
      setSuccessText("Профиль сохранен.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Не удалось сохранить профиль");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true">
        <button className="modal-close icon-btn" type="button" onClick={onClose}>
          <X size={17} aria-hidden="true" />
        </button>
        <h2>Профиль</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Фамилия
            <input
              type="text"
              autoComplete="family-name"
              value={profile.last_name}
              onChange={handleChange("last_name")}
              disabled={isLoading}
            />
          </label>
          <label>
            Имя
            <input
              type="text"
              autoComplete="given-name"
              value={profile.first_name}
              onChange={handleChange("first_name")}
              disabled={isLoading}
            />
          </label>
          <label>
            Отчество
            <input
              type="text"
              autoComplete="additional-name"
              value={profile.middle_name}
              onChange={handleChange("middle_name")}
              disabled={isLoading}
            />
          </label>

          {errorText ? <div className="form-message form-message-error">{errorText}</div> : null}
          {successText ? <div className="form-message form-message-success">{successText}</div> : null}

          <button className="btn btn-secondary modal-submit" type="submit" disabled={isLoading || isSaving}>
            {isSaving ? <Save size={16} aria-hidden="true" /> : <User size={16} aria-hidden="true" />}
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}

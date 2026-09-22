import { MapPinned } from "lucide-react";

export default function StationTransferForm({
  transferForm,
  transferError,
  isTransferringStation,
  onSubmit,
  onFormChange,
  onCancel,
}) {
  const updateField = (field, value) => onFormChange((current) => ({ ...current, [field]: value }));

  return (
    <form className="station-edit-form station-transfer-form" onSubmit={onSubmit}>
      <label>
        <span>Серийный номер</span>
        <strong className="station-readonly-value">{transferForm.serial}</strong>
      </label>
      <label>
        <span>Название на новом месте</span>
        <input
          value={transferForm.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Например, Пост у главного корпуса"
        />
      </label>
      <label>
        <span>Тип поста</span>
        <select value={transferForm.post_type} onChange={(event) => updateField("post_type", event.target.value)}>
          <option value="">Выберите тип</option>
          <option value="stationary">Стационарный</option>
          <option value="mobile">Мобильный</option>
          <option value="drone">Дрон</option>
        </select>
      </label>
      <div className="station-edit-grid">
        <label>
          <span>Новая широта</span>
          <input
            value={transferForm.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            inputMode="decimal"
            required
          />
        </label>
        <label>
          <span>Новая долгота</span>
          <input
            value={transferForm.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            inputMode="decimal"
            required
          />
        </label>
      </div>
      <label>
        <span>Заметки</span>
        <textarea
          value={transferForm.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Поле для заметок"
        />
      </label>
      {transferError && <p className="station-card-error">{transferError}</p>}
      <label className="station-confirm-check">
        <input
          type="checkbox"
          checked={transferForm.is_confirmed}
          onChange={(event) => updateField("is_confirmed", event.target.checked)}
        />
        <span>Новая точка подтверждена</span>
      </label>
      <div className="station-form-actions">
        <button className="btn btn-secondary" type="submit" disabled={isTransferringStation}>
          <MapPinned size={16} aria-hidden="true" />
          <span>{isTransferringStation ? "Перенос..." : "Перенести"}</span>
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

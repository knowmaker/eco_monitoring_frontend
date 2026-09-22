import { Save } from "lucide-react";

export default function StationEditForm({
  stationForm,
  stationSaveError,
  isSavingStation,
  onSubmit,
  onFormChange,
  onCancel,
}) {
  const updateField = (field, value) => onFormChange((current) => ({ ...current, [field]: value }));

  return (
    <form className="station-edit-form station-edit-form-inline" onSubmit={onSubmit}>
      <label>
        <span>Серийный номер</span>
        <strong className="station-readonly-value">{stationForm.serial}</strong>
      </label>
      <label>
        <span>Название</span>
        <input
          value={stationForm.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Например, Пост у главного корпуса"
        />
      </label>
      <label>
        <span>Тип поста</span>
        <select value={stationForm.post_type} onChange={(event) => updateField("post_type", event.target.value)}>
          <option value="">Выберите тип</option>
          <option value="stationary">Стационарный</option>
          <option value="mobile">Мобильный</option>
          <option value="drone">Дрон</option>
        </select>
      </label>
      <div className="station-edit-grid">
        <label>
          <span>Широта</span>
          <input
            value={stationForm.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          <span>Долгота</span>
          <input
            value={stationForm.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>
      <label>
        <span>Заметки</span>
        <textarea
          value={stationForm.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Поле для заметок"
        />
      </label>
      {stationSaveError && <p className="station-card-error">{stationSaveError}</p>}
      <label className="station-confirm-check">
        <input
          type="checkbox"
          checked={stationForm.is_confirmed}
          onChange={(event) => updateField("is_confirmed", event.target.checked)}
        />
        <span>Станция подтверждена</span>
      </label>
      <div className="station-form-actions">
        <button className="btn btn-secondary" type="submit" disabled={isSavingStation}>
          <Save size={16} aria-hidden="true" />
          <span>{isSavingStation ? "Сохранение..." : "Сохранить"}</span>
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

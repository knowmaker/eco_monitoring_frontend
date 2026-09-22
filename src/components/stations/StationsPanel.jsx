import { CheckCircle2, CircleDashed, Pencil, RefreshCw, X } from "lucide-react";

import { getPostTitle, POST_TYPE_LABELS } from "../../domain/monitoringPosts";
import StationEditForm from "./StationEditForm";

export default function StationsPanel({
  isStationDetailsInPanel,
  isAdmin,
  isLoadingAdminPosts,
  adminPostsError,
  stationPanelPosts,
  selectedMonitoringPostId,
  editingStationId,
  stationForm,
  stationSaveError,
  isSavingStation,
  children,
  onRefresh,
  onClose,
  onSelectPost,
  onStartEdit,
  onSaveStation,
  onStationFormChange,
  onCancelEdit,
}) {
  return (
    <aside className="stations-panel">
      <div className="card-header">
        <h2>{isStationDetailsInPanel ? "Информация о станции" : "Станции мониторинга"}</h2>
        <div className="card-header-actions">
          <button type="button" className="card-refresh-btn" onClick={onRefresh}>
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className="card-close-btn" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isStationDetailsInPanel ? (
        children
      ) : (
        <>
          {isAdmin && isLoadingAdminPosts && <p className="station-card-hint">Загрузка списка станций...</p>}
          {isAdmin && adminPostsError && <p className="station-card-error">{adminPostsError}</p>}

          <ul className="stations-list">
            {stationPanelPosts.map((post) => (
              <li key={post.id}>
                <div className="station-list-row">
                  <button
                    type="button"
                    className={`station-list-button${
                      selectedMonitoringPostId === post.id ? " station-list-button-active" : ""
                    }`}
                    onClick={() => onSelectPost(post)}
                  >
                    <span className="station-list-text">
                      <strong title={getPostTitle(post)}>{getPostTitle(post)}</strong>
                      <small>{POST_TYPE_LABELS[post.post_type] ?? "Тип не выбран"}</small>
                    </span>
                    {post.is_confirmed ? (
                      <span className="station-status station-status-confirmed" title="Подтверждена">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span className="station-status station-status-pending" title="Не подтверждена">
                        <CircleDashed size={16} />
                      </span>
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      className="station-row-edit"
                      type="button"
                      title="Редактировать"
                      onClick={() => onStartEdit(post)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {editingStationId === post.id && (
                  <StationEditForm
                    stationForm={stationForm}
                    stationSaveError={stationSaveError}
                    isSavingStation={isSavingStation}
                    onSubmit={onSaveStation}
                    onFormChange={onStationFormChange}
                    onCancel={onCancelEdit}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

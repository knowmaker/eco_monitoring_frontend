import { CheckCircle2, CircleDashed, Pencil, RefreshCw, X } from "lucide-react";

import { getPostTitle, POST_TYPE_LABELS } from "../../domain/monitoringPosts";
import ScrollablePanel from "../layout/ScrollablePanel";

function getPostTypeLabel(post) {
  const typeLabel = POST_TYPE_LABELS[post.post_type] ?? "Тип не выбран";
  return post.active_to ? `Архивная - ${typeLabel}` : typeLabel;
}

const POST_STATUS_BADGES = {
  active: { label: "Активна", className: "station-list-status-badge-active" },
  passive: { label: "Пассивна", className: "station-list-status-badge-passive" },
  archived: { label: "В архиве", className: "station-list-status-badge-archive" },
};

function getPostStatusBadge(post) {
  return POST_STATUS_BADGES[post.activity_status] ?? null;
}

export default function StationsPanel({
  isCovered = false,
  isStationDetailsInPanel,
  isAdmin,
  isLoadingAdminPosts,
  adminPostsError,
  stationPanelPosts,
  selectedMonitoringPostId,
  children,
  onRefresh,
  onClose,
  onSelectPost,
  onEditSelectedPost,
}) {
  return (
    <ScrollablePanel
      className={`stations-panel${isCovered ? " stations-panel-covered" : ""}`}
      aria-hidden={isCovered || undefined}
    >
      <div className="card-header">
        <h2>{isStationDetailsInPanel ? "Информация о станции" : "Станции мониторинга"}</h2>
        <div className="card-header-actions">
          {isAdmin && isStationDetailsInPanel && (
            <button
              type="button"
              className="card-edit-btn"
              title="Редактировать"
              onClick={onEditSelectedPost}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
          )}
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
            {stationPanelPosts.map((post) => {
              const statusBadge = getPostStatusBadge(post);
              return (
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
                        <small>{getPostTypeLabel(post)}</small>
                      </span>
                      {statusBadge && (
                        <span
                          className={`station-list-status-badge ${statusBadge.className}`}
                          title={statusBadge.label}
                        >
                          {statusBadge.label}
                        </span>
                      )}
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
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ScrollablePanel>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Calculator,
  CheckCircle2,
  CircleDashed,
  Database,
  List,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  RadioTower,
  RefreshCw,
  Save,
  TrendingUp,
  User,
  UserPlus,
  X,
} from "lucide-react";
import maplibregl from "maplibre-gl";

import AuthModal from "./components/AuthModal";
import LatestStationReadings from "./components/LatestStationReadings";
import ProfileModal from "./components/ProfileModal";
import RawMqttPayloadCard from "./components/RawMqttPayloadCard";
import SensorReadingsCard from "./components/SensorReadingsCard";
import {
  AUTH_IS_ADMIN_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  fetchAvailableDeviceState,
  fetchMonitoringPosts,
  fetchMonitoringPostsAdmin,
  updateMonitoringPost,
} from "./lib/api";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [38.124629, 55.950523];
const DEFAULT_ZOOM = 12;
const POSTS_REFRESH_MS = 30_000;
const MOBILE_VIEWPORT_QUERY = "(max-width: 760px)";
const HIDDEN_BOUNDARY_LAYER_IDS = ["boundary_2", "boundary_disputed"];
const RUSSIAN_MAP_LABEL_FIELD = ["coalesce", ["get", "name:ru"], ["get", "name_ru"], ""];

const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
};

const POST_TYPE_LABELS = {
  stationary: "Стационарный",
  mobile: "Мобильный",
  drone: "Дрон",
};

function createTowerMarkerElement(isActive) {
  const element = document.createElement("div");
  element.className = `tower-marker${isActive ? " tower-marker-active" : ""}`;
  const root = createRoot(element);
  root.render(<RadioTower size={23} strokeWidth={2.2} aria-hidden="true" />);
  return { element, root };
}

function removeTowerMarkers(markerEntries) {
  markerEntries.forEach(({ marker, root }) => {
    root.unmount();
    marker.remove();
  });
}

function formatCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "—";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function getPostTitle(post) {
  if (!post) {
    return "—";
  }
  return post.name || post.serial;
}

function formatCoordinateInput(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function toNullableFloat(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyStationForm() {
  return {
    serial: "",
    name: "",
    post_type: "",
    latitude: "",
    longitude: "",
    notes: "",
    is_confirmed: true,
  };
}

function hidePoliticalBoundaries(map) {
  HIDDEN_BOUNDARY_LAYER_IDS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  });
}

function isNameLabelLayer(layer) {
  if (layer.type !== "symbol" || !layer.layout?.["text-field"]) {
    return false;
  }
  return JSON.stringify(layer.layout["text-field"]).includes("name");
}

function applyRussianMapLabels(map) {
  map.getStyle().layers.filter(isNameLabelLayer).forEach((layer) => {
    map.setLayoutProperty(layer.id, "text-field", RUSSIAN_MAP_LABEL_FIELD);
  });
}

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [monitoringPosts, setMonitoringPosts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsReloadToken, setPostsReloadToken] = useState(0);
  const [activeMenuPanel, setActiveMenuPanel] = useState(null);
  const [adminMonitoringPosts, setAdminMonitoringPosts] = useState([]);
  const [isLoadingAdminPosts, setIsLoadingAdminPosts] = useState(false);
  const [adminPostsError, setAdminPostsError] = useState("");
  const [editingStationId, setEditingStationId] = useState(null);
  const [stationForm, setStationForm] = useState(createEmptyStationForm);
  const [isSavingStation, setIsSavingStation] = useState(false);
  const [stationSaveError, setStationSaveError] = useState("");

  const [selectedMonitoringPostId, setSelectedMonitoringPostId] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isStationCardOpen, setIsStationCardOpen] = useState(false);
  const [stationCardSource, setStationCardSource] = useState(null);
  const [isReadingsCardOpen, setIsReadingsCardOpen] = useState(false);
  const [isRawPacketsOpen, setIsRawPacketsOpen] = useState(false);
  const [stationDetailsRefreshCounter, setStationDetailsRefreshCounter] = useState(0);

  const [modalMode, setModalMode] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const statusText = useMemo(() => {
    if (isLoadingPosts) {
      return "Загрузка станций...";
    }
    if (loadError) {
      return loadError;
    }
    return `Станций на карте: ${monitoringPosts.length}`;
  }, [monitoringPosts.length, isLoadingPosts, loadError]);
  const statusKind = loadError ? "error" : isLoadingPosts ? "loading" : "ready";

  const stationPanelPosts = isAdmin ? adminMonitoringPosts : monitoringPosts;
  const knownMonitoringPosts = isAdmin && adminMonitoringPosts.length ? adminMonitoringPosts : monitoringPosts;
  const selectedMonitoringPost =
    knownMonitoringPosts.find((post) => post.id === selectedMonitoringPostId) ?? null;

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const storedIsAdmin = localStorage.getItem(AUTH_IS_ADMIN_STORAGE_KEY) === "true";
    setIsAuthenticated(Boolean(token));
    setIsAdmin(Boolean(token) && storedIsAdmin);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const handleChange = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);
      if (isMobile) {
        setIsRawPacketsOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    mapRef.current.on("load", () => {
      hidePoliticalBoundaries(mapRef.current);
      applyRussianMapLabels(mapRef.current);
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    return () => {
      removeTowerMarkers(markersRef.current);
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMonitoringPosts = async () => {
      try {
        const incomingPosts = await fetchMonitoringPosts();
        if (cancelled) {
          return;
        }

        setMonitoringPosts(incomingPosts);
        setSelectedMonitoringPostId((current) => {
          if (current === null) {
            return current;
          }
          if (isAdmin) {
            return current;
          }
          return incomingPosts.some((post) => post.id === current) ? current : null;
        });
        setLoadError("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Не удалось получить станции");
      } finally {
        if (!cancelled) {
          setIsLoadingPosts(false);
        }
      }
    };

    loadMonitoringPosts();
    const intervalId = setInterval(loadMonitoringPosts, POSTS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isAdmin, postsReloadToken]);

  const loadAdminMonitoringPosts = useCallback(async () => {
    if (!isAdmin) {
      setAdminMonitoringPosts([]);
      setAdminPostsError("");
      setIsLoadingAdminPosts(false);
      return;
    }

    setIsLoadingAdminPosts(true);
    setAdminPostsError("");
    try {
      const incomingPosts = await fetchMonitoringPostsAdmin();
      setAdminMonitoringPosts(incomingPosts);
    } catch (error) {
      setAdminPostsError(error instanceof Error ? error.message : "Не удалось загрузить список станций");
    } finally {
      setIsLoadingAdminPosts(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeMenuPanel === "stations") {
      loadAdminMonitoringPosts();
    }
  }, [activeMenuPanel, loadAdminMonitoringPosts, postsReloadToken]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    removeTowerMarkers(markersRef.current);
    markersRef.current = [];

    const points = monitoringPosts.filter(
      (post) => Number.isFinite(post.latitude) && Number.isFinite(post.longitude)
    );

    points.forEach((post) => {
      const { element, root } = createTowerMarkerElement(post.id === selectedMonitoringPostId);
      element.title = getPostTitle(post);
      element.addEventListener("click", () => {
        setActiveMenuPanel("stations");
        setIsStationCardOpen(true);
        setStationCardSource("map");
        setEditingStationId(null);
        setIsReadingsCardOpen(false);
        setIsRawPacketsOpen(false);
        setSelectedMonitoringPostId(post.id);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([post.longitude, post.latitude])
        .addTo(mapRef.current);

      markersRef.current.push({ marker, root });
    });
  }, [monitoringPosts, selectedMonitoringPostId]);

  useEffect(() => {
    if (selectedMonitoringPostId === null) {
      setSelectedDevices([]);
      setSelectedDeviceType(null);
      setDetailsError("");
      setIsLoadingDetails(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);
    setDetailsError("");
    setSelectedDevices([]);
    setSelectedDeviceType(null);

    fetchAvailableDeviceState(selectedMonitoringPostId)
      .then((devices) => {
        if (cancelled) {
          return;
        }
        setSelectedDevices(devices);
        setSelectedDeviceType((current) => {
          if (current && devices.some((device) => device.device_type === current)) {
            return current;
          }
          return null;
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDetailsError(error instanceof Error ? error.message : "Не удалось получить данные станции");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonitoringPostId, stationDetailsRefreshCounter]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_IS_ADMIN_STORAGE_KEY);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsProfileModalOpen(false);
    setAdminMonitoringPosts([]);
    setEditingStationId(null);
    setStationCardSource(null);
    setIsRawPacketsOpen(false);
    setStationForm(createEmptyStationForm());
  };

  const handleSelectMonitoringPost = (post) => {
    setSelectedMonitoringPostId(post.id);
    setIsStationCardOpen(true);
    setStationCardSource("list");
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    if (Number.isFinite(post.latitude) && Number.isFinite(post.longitude) && mapRef.current) {
      mapRef.current.flyTo({ center: [post.longitude, post.latitude], zoom: Math.max(mapRef.current.getZoom(), 13) });
    }
  };

  const handleStartEditStation = (post) => {
    setEditingStationId(post.id);
    setStationSaveError("");
    setStationForm({
      serial: post.serial,
      name: post.name || "",
      post_type: post.post_type || "",
      latitude: formatCoordinateInput(post.latitude),
      longitude: formatCoordinateInput(post.longitude),
      notes: post.notes || "",
      is_confirmed: Boolean(post.is_confirmed),
    });
  };

  const handleSaveStation = async (event) => {
    event.preventDefault();
    setIsSavingStation(true);
    setStationSaveError("");

    const payload = {
      name: stationForm.name.trim() || null,
      post_type: stationForm.post_type || null,
      latitude: toNullableFloat(stationForm.latitude),
      longitude: toNullableFloat(stationForm.longitude),
      notes: stationForm.notes.trim() || null,
      is_confirmed: stationForm.is_confirmed,
    };

    if (
      payload.is_confirmed &&
      (!payload.name || !payload.post_type || payload.latitude === null || payload.longitude === null)
    ) {
      setStationSaveError("Для подтверждения станции заполните название, тип поста и координаты.");
      setIsSavingStation(false);
      return;
    }

    try {
      const savedPost = await updateMonitoringPost(editingStationId, payload);
      setEditingStationId(null);
      setStationForm(createEmptyStationForm());
      setSelectedMonitoringPostId(savedPost.id);
      setPostsReloadToken((value) => value + 1);
      await loadAdminMonitoringPosts();
    } catch (error) {
      setStationSaveError(error instanceof Error ? error.message : "Не удалось сохранить станцию");
    } finally {
      setIsSavingStation(false);
    }
  };

  const isStationDetailsInPanel =
    activeMenuPanel === "stations" &&
    isStationCardOpen &&
    selectedMonitoringPostId !== null;

  const closeStationDetails = () => {
    setIsStationCardOpen(false);
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    setSelectedMonitoringPostId(null);
    if (stationCardSource === "map") {
      setActiveMenuPanel(null);
    }
    setStationCardSource(null);
  };

  const handleRefreshStationPanel = () => {
    setPostsReloadToken((value) => value + 1);
    if (isStationDetailsInPanel) {
      setStationDetailsRefreshCounter((value) => value + 1);
    }
  };

  const stationDetailsBody = (
    <>
      <div className="station-grid">
        <div>
          <span className="station-grid-label">Название</span>
          <span className="station-grid-value">{getPostTitle(selectedMonitoringPost)}</span>
        </div>
        <div>
          <span className="station-grid-label">Тип поста</span>
          <span className="station-grid-value">
            {POST_TYPE_LABELS[selectedMonitoringPost?.post_type] ?? selectedMonitoringPost?.post_type ?? "—"}
          </span>
        </div>
        <div>
          <span className="station-grid-label">Координаты</span>
          <span className="station-grid-value">
            {formatCoordinates(selectedMonitoringPost?.latitude, selectedMonitoringPost?.longitude)}
          </span>
        </div>
      </div>
      {isAdmin && selectedMonitoringPost?.notes && (
        <div className="station-notes">
          <span className="station-grid-label">Заметки</span>
          <p>{selectedMonitoringPost.notes}</p>
        </div>
      )}
      {isAdmin && !isMobileViewport && (
        <button
          type="button"
          className={`station-raw-action${isRawPacketsOpen ? " station-raw-action-active" : ""}`}
          onClick={() => {
            setIsRawPacketsOpen(true);
            setIsReadingsCardOpen(false);
          }}
        >
          <Database size={15} aria-hidden="true" />
          <span>Сырые пакеты данных с брокера</span>
        </button>
      )}
      <LatestStationReadings
        monitoringPostId={selectedMonitoringPostId}
        refreshCounter={stationDetailsRefreshCounter}
      />

      {isLoadingDetails && <p className="station-card-hint">Загрузка данных станции...</p>}
      {!isLoadingDetails && detailsError && <p className="station-card-error">{detailsError}</p>}

      {!isLoadingDetails && !detailsError && (
        <section className="station-section station-devices-section">
          <h3>Исторические наблюдения</h3>
          {selectedDevices.length ? (
            <ul className="station-device-list">
              {selectedDevices.map((device) => (
                <li key={device.device_type} className="station-device-item">
                  <div className="station-device-row">
                    <button
                      type="button"
                      className={`station-device-button${
                        selectedDeviceType === device.device_type && isReadingsCardOpen
                          ? " station-device-button-active"
                          : ""
                        }`}
                      onClick={() => {
                        setSelectedDeviceType(device.device_type);
                        setIsReadingsCardOpen(true);
                        setIsRawPacketsOpen(false);
                      }}
                    >
                      <span className="station-device-type">
                        {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                      </span>
                      <span className="station-device-name">{device.device_name || "Без имени"}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}
    </>
  );

  const stationEditForm = (
    <form className="station-edit-form station-edit-form-inline" onSubmit={handleSaveStation}>
      <label>
        <span>Серийный номер</span>
        <strong className="station-readonly-value">{stationForm.serial}</strong>
      </label>
      <label>
        <span>Название</span>
        <input
          value={stationForm.name}
          onChange={(event) => setStationForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Например, Пост у главного корпуса"
        />
      </label>
      <label>
        <span>Тип поста</span>
        <select
          value={stationForm.post_type}
          onChange={(event) => setStationForm((current) => ({ ...current, post_type: event.target.value }))}
        >
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
            onChange={(event) => setStationForm((current) => ({ ...current, latitude: event.target.value }))}
            inputMode="decimal"
          />
        </label>
        <label>
          <span>Долгота</span>
          <input
            value={stationForm.longitude}
            onChange={(event) => setStationForm((current) => ({ ...current, longitude: event.target.value }))}
            inputMode="decimal"
          />
        </label>
      </div>
      <label>
        <span>Заметки</span>
        <textarea
          value={stationForm.notes}
          onChange={(event) => setStationForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Поле для заметок"
        />
      </label>
      {stationSaveError && <p className="station-card-error">{stationSaveError}</p>}
      <label className="station-confirm-check">
        <input
          type="checkbox"
          checked={stationForm.is_confirmed}
          onChange={(event) =>
            setStationForm((current) => ({ ...current, is_confirmed: event.target.checked }))
          }
        />
        <span>Станция подтверждена</span>
      </label>
      <div className="station-form-actions">
        <button className="btn btn-secondary" type="submit" disabled={isSavingStation}>
          <Save size={16} aria-hidden="true" />
          <span>{isSavingStation ? "Сохранение..." : "Сохранить"}</span>
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setEditingStationId(null);
            setStationSaveError("");
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );

  return (
    <div className="app-shell">
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
              <button className="btn btn-profile" type="button" onClick={() => setIsProfileModalOpen(true)}>
                <User size={16} aria-hidden="true" />
                <span className="btn-label">Профиль</span>
              </button>
              <button className="btn btn-danger" type="button" onClick={handleLogout}>
                <LogOut size={16} aria-hidden="true" />
                <span className="btn-label">Выход</span>
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" type="button" onClick={() => setModalMode("login")}>
                <LogIn size={16} aria-hidden="true" />
                <span className="btn-label">Вход</span>
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setModalMode("register")}>
                <UserPlus size={16} aria-hidden="true" />
                <span className="btn-label">Регистрация</span>
              </button>
            </>
          )}
        </div>
      </header>

      <nav className={`side-menu${activeMenuPanel ? " side-menu-collapsed" : ""}`}>
        <button
          type="button"
          className={`side-menu-button${activeMenuPanel === "stations" ? " side-menu-button-active" : ""}`}
          onClick={() => setActiveMenuPanel((current) => (current === "stations" ? null : "stations"))}
        >
          <List size={18} aria-hidden="true" />
          <span>Станции мониторинга</span>
        </button>
        <button type="button" className="side-menu-button side-menu-button-disabled" disabled>
          <Calculator size={18} aria-hidden="true" />
          <span>Математические модели расчетов</span>
        </button>
        <button type="button" className="side-menu-button side-menu-button-disabled" disabled>
          <TrendingUp size={18} aria-hidden="true" />
          <span>Прогнозирование</span>
        </button>
      </nav>

      {activeMenuPanel === "stations" && (
        <aside className="stations-panel">
          <div className="card-header">
            <h2>{isStationDetailsInPanel ? "Информация о станции" : "Станции мониторинга"}</h2>
            <div className="card-header-actions">
              <button
                type="button"
                className="card-refresh-btn"
                onClick={handleRefreshStationPanel}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="card-close-btn"
                onClick={() => {
                  if (isStationDetailsInPanel) {
                    closeStationDetails();
                  } else {
                    setActiveMenuPanel(null);
                  }
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {isStationDetailsInPanel ? (
            stationDetailsBody
          ) : (
            <>
              {isAdmin && isLoadingAdminPosts && (
                <p className="station-card-hint">Загрузка списка станций...</p>
              )}
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
                        onClick={() => handleSelectMonitoringPost(post)}
                      >
                        <span>
                          <strong>{getPostTitle(post)}</strong>
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
                          onClick={() => handleStartEditStation(post)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {editingStationId === post.id && stationEditForm}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}

      {isStationCardOpen && isReadingsCardOpen && selectedMonitoringPostId !== null && selectedDeviceType && (
        <SensorReadingsCard
          monitoringPostId={selectedMonitoringPostId}
          selectedDeviceType={selectedDeviceType}
          onClose={() => setIsReadingsCardOpen(false)}
        />
      )}

      {isAdmin && !isMobileViewport && isStationCardOpen && isRawPacketsOpen && selectedMonitoringPostId !== null && (
        <RawMqttPayloadCard
          monitoringPostId={selectedMonitoringPostId}
          onClose={() => setIsRawPacketsOpen(false)}
        />
      )}

      <main ref={mapContainerRef} className="map-root" />

      {modalMode && (
        <AuthModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onAuthSuccess={({ isAdmin: nextIsAdmin }) => {
            setIsAuthenticated(true);
            setIsAdmin(Boolean(nextIsAdmin));
          }}
        />
      )}
      {isAuthenticated && isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
}

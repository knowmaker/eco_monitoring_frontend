import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import AuthModal from "./components/AuthModal";
import {
  AUTH_TOKEN_STORAGE_KEY,
  fetchAvailableDeviceState,
  fetchLatestPlcState,
  fetchMonitoringPosts,
} from "./lib/api";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [38.124629, 55.950523];
const DEFAULT_ZOOM = 12;
const POSTS_REFRESH_MS = 30_000;

const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
};

function createTowerMarkerElement(isActive) {
  const element = document.createElement("div");
  element.className = `tower-marker${isActive ? " tower-marker-active" : ""}`;
  element.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M30 10h4l6 36h-4l-2-12h-4l-2 12h-4z" fill="currentColor"/>
      <circle cx="32" cy="8" r="4" fill="currentColor"/>
      <path d="M22 22c4-4 16-4 20 0M18 16c6-6 22-6 28 0M26 28c3-3 9-3 12 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
  return element;
}

function formatEpochMs(epochMs) {
  if (!Number.isFinite(epochMs)) {
    return "—";
  }
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU");
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU");
}

function formatCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "—";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [monitoringPosts, setMonitoringPosts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [selectedMonitoringPostId, setSelectedMonitoringPostId] = useState(null);
  const [selectedPlcState, setSelectedPlcState] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const statusText = useMemo(() => {
    if (isLoadingPosts) {
      return "Загрузка станций...";
    }
    if (loadError) {
      return loadError;
    }
    return `Станций на карте: ${monitoringPosts.length}`;
  }, [monitoringPosts.length, isLoadingPosts, loadError]);

  const selectedMonitoringPost =
    monitoringPosts.find((post) => post.id === selectedMonitoringPostId) ?? null;

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    setIsAuthenticated(Boolean(token));
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

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
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
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const points = monitoringPosts.filter(
      (post) => Number.isFinite(post.latitude) && Number.isFinite(post.longitude)
    );

    points.forEach((post) => {
      const element = createTowerMarkerElement(post.id === selectedMonitoringPostId);
      element.title = `Станция ${post.serial}`;
      element.addEventListener("click", () => {
        setSelectedMonitoringPostId(post.id);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([post.longitude, post.latitude])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [monitoringPosts, selectedMonitoringPostId]);

  useEffect(() => {
    if (selectedMonitoringPostId === null) {
      setSelectedPlcState(null);
      setSelectedDevices([]);
      setDetailsError("");
      setIsLoadingDetails(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);
    setDetailsError("");
    setSelectedPlcState(null);
    setSelectedDevices([]);

    Promise.all([
      fetchLatestPlcState(selectedMonitoringPostId),
      fetchAvailableDeviceState(selectedMonitoringPostId),
    ])
      .then(([plcState, devices]) => {
        if (cancelled) {
          return;
        }
        setSelectedPlcState(plcState);
        setSelectedDevices(devices);
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
  }, [selectedMonitoringPostId]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-dot" />
          <h1>Eco Monitoring</h1>
        </div>
        <div className="topbar-actions">
          {isAuthenticated ? (
            <button className="logout-btn" type="button" onClick={handleLogout}>
              Выход
            </button>
          ) : (
            <>
              <button className="ghost-btn" type="button" onClick={() => setModalMode("login")}>
                Вход
              </button>
              <button className="primary-btn" type="button" onClick={() => setModalMode("register")}>
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      <div className="status-panel">{statusText}</div>

      <aside className="station-card">
        <h2>Карточка станции</h2>

        {selectedMonitoringPostId === null && (
          <p className="station-card-hint">Нажмите на точку на карте, чтобы посмотреть данные станции.</p>
        )}

        {selectedMonitoringPostId !== null && (
          <>
            <div className="station-grid">
              <div>
                <span className="station-grid-label">ID</span>
                <span className="station-grid-value">{selectedMonitoringPost?.id ?? "—"}</span>
              </div>
              <div>
                <span className="station-grid-label">Серийный номер</span>
                <span className="station-grid-value">{selectedMonitoringPost?.serial ?? "—"}</span>
              </div>
              <div>
                <span className="station-grid-label">Координаты</span>
                <span className="station-grid-value">
                  {formatCoordinates(selectedMonitoringPost?.latitude, selectedMonitoringPost?.longitude)}
                </span>
              </div>
              <div>
                <span className="station-grid-label">Тип поста</span>
                <span className="station-grid-value">
                  {selectedMonitoringPost?.is_stationary ? "Стационарный" : "Мобильный"}
                </span>
              </div>
            </div>

            {isLoadingDetails && <p className="station-card-hint">Загрузка данных станции...</p>}
            {!isLoadingDetails && detailsError && <p className="station-card-error">{detailsError}</p>}

            {!isLoadingDetails && !detailsError && (
              <>
                <section className="station-section">
                  <h3>Данные PLC</h3>
                  {selectedPlcState ? (
                    <div className="station-grid station-grid-compact">
                      <div>
                        <span className="station-grid-label">Время PLC</span>
                        <span className="station-grid-value">{formatEpochMs(selectedPlcState.plc_timestamp_ms)}</span>
                      </div>
                      <div>
                        <span className="station-grid-label">Получено сервером</span>
                        <span className="station-grid-value">{formatDateTime(selectedPlcState.received_at)}</span>
                      </div>
                      <div>
                        <span className="station-grid-label">Период агрегации</span>
                        <span className="station-grid-value">{selectedPlcState.aggregation_period_min} мин</span>
                      </div>
                    </div>
                  ) : (
                    <p className="station-card-hint">По этой станции пока нет записей в plc_state.</p>
                  )}
                </section>

                <section className="station-section">
                  <h3>Устройства станции</h3>
                  {selectedDevices.length ? (
                    <ul className="station-device-list">
                      {selectedDevices.map((device) => (
                        <li key={device.device_type} className="station-device-item">
                          <span className="station-device-type">
                            {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                          </span>
                          <span className="station-device-name">{device.device_name || "Без имени"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="station-card-hint">Нет доступных устройств (только BAD ping за весь период).</p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </aside>

      <main ref={mapContainerRef} className="map-root" />

      {modalMode && (
        <AuthModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onAuthSuccess={() => setIsAuthenticated(true)}
        />
      )}
    </div>
  );
}

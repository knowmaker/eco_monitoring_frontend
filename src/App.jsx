import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LogIn, LogOut, MapPin, RadioTower, UserPlus, X } from "lucide-react";
import maplibregl from "maplibre-gl";

import AuthModal from "./components/AuthModal";
import SensorReadingsCard from "./components/SensorReadingsCard";
import {
  AUTH_TOKEN_STORAGE_KEY,
  fetchAvailableDeviceState,
  fetchMonitoringPosts,
} from "./lib/api";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [38.124629, 55.950523];
const DEFAULT_ZOOM = 12;
const POSTS_REFRESH_MS = 30_000;
const HIDDEN_BOUNDARY_LAYER_IDS = ["boundary_2", "boundary_disputed"];
const RUSSIAN_MAP_LABEL_FIELD = ["coalesce", ["get", "name:ru"], ["get", "name_ru"], ""];

const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
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

  const [selectedMonitoringPostId, setSelectedMonitoringPostId] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isStationCardOpen, setIsStationCardOpen] = useState(false);
  const [isReadingsCardOpen, setIsReadingsCardOpen] = useState(false);

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
  const statusKind = loadError ? "error" : isLoadingPosts ? "loading" : "ready";

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

    removeTowerMarkers(markersRef.current);
    markersRef.current = [];

    const points = monitoringPosts.filter(
      (post) => Number.isFinite(post.latitude) && Number.isFinite(post.longitude)
    );

    points.forEach((post) => {
      const { element, root } = createTowerMarkerElement(post.id === selectedMonitoringPostId);
      element.title = `Станция ${post.serial}`;
      element.addEventListener("click", () => {
        setIsStationCardOpen(true);
        setIsReadingsCardOpen(true);
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
  }, [selectedMonitoringPostId]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setIsAuthenticated(false);
  };

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
            <button className="btn btn-danger" type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Выход
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" type="button" onClick={() => setModalMode("login")}>
                <LogIn size={16} aria-hidden="true" />
                Вход
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setModalMode("register")}>
                <UserPlus size={16} aria-hidden="true" />
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      {isStationCardOpen && selectedMonitoringPostId !== null && (
        <aside className="station-card">
          <div className="card-header">
            <h2>Информация о станции</h2>
            <button
              type="button"
              className="card-close-btn"
              aria-label="Закрыть карточки"
              onClick={() => {
                setIsStationCardOpen(false);
                setIsReadingsCardOpen(false);
                setSelectedMonitoringPostId(null);
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <>
            <div className="station-grid">
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
              <section className="station-section">
                <h3>Устройства станции</h3>
                {selectedDevices.length ? (
                  <ul className="station-device-list">
                    {selectedDevices.map((device) => (
                      <li key={device.device_type} className="station-device-item">
                        <button
                          type="button"
                          className={`station-device-button${
                            selectedDeviceType === device.device_type ? " station-device-button-active" : ""
                          }`}
                          onClick={() => setSelectedDeviceType(device.device_type)}
                        >
                          <span className="station-device-type">
                            {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                          </span>
                          <span className="station-device-name">{device.device_name || "Без имени"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="station-card-hint">
                    Нет доступных устройств (только BAD ping за весь период).
                  </p>
                )}
              </section>
            )}
          </>
        </aside>
      )}

      {isStationCardOpen && isReadingsCardOpen && selectedMonitoringPostId !== null && (
        <SensorReadingsCard
          monitoringPostId={selectedMonitoringPostId}
          selectedDeviceType={selectedDeviceType}
          onClose={() => setIsReadingsCardOpen(false)}
        />
      )}

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

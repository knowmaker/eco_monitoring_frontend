import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import AuthModal from "./components/AuthModal";
import { AUTH_TOKEN_STORAGE_KEY, fetchDevices } from "./lib/api";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [38.124629, 55.950523];
const DEFAULT_ZOOM = 12;
const DEVICES_REFRESH_MS = 30_000;

function createTowerMarkerElement() {
  const element = document.createElement("div");
  element.className = "tower-marker";
  element.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M30 10h4l6 36h-4l-2-12h-4l-2 12h-4z" fill="currentColor"/>
      <circle cx="32" cy="8" r="4" fill="currentColor"/>
      <path d="M22 22c4-4 16-4 20 0M18 16c6-6 22-6 28 0M26 28c3-3 9-3 12 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
  return element;
}

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [devices, setDevices] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const statusText = useMemo(() => {
    if (isLoadingDevices) {
      return "Загрузка устройств...";
    }
    if (loadError) {
      return loadError;
    }
    return `Устройств на карте: ${devices.length}`;
  }, [devices.length, isLoadingDevices, loadError]);

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

    const load = async () => {
      try {
        const incomingDevices = await fetchDevices();
        if (cancelled) {
          return;
        }
        setDevices(incomingDevices);
        setLoadError("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Не удалось получить устройства");
      } finally {
        if (!cancelled) {
          setIsLoadingDevices(false);
        }
      }
    };

    load();
    const intervalId = setInterval(load, DEVICES_REFRESH_MS);
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

    const points = devices.filter((device) => Number.isFinite(device.latitude) && Number.isFinite(device.longitude));
    points.forEach((device) => {
      const marker = new maplibregl.Marker({ element: createTowerMarkerElement() })
        .setLngLat([device.longitude, device.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            `<strong>${device.serial}</strong><br/>Широта: ${device.latitude}<br/>Долгота: ${device.longitude}`
          )
        )
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [devices]);

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

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Building2, RadioTower, Truck } from "lucide-react";
import maplibregl from "maplibre-gl";

import { getPostTitle } from "../../domain/monitoringPosts";
import { updateConcentrationMap } from "./concentrationMapLayer";
import { removeTemperatureProfileLayer, updateTemperatureProfileLayer } from "./temperatureProfileLayer";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [37.6173, 55.7558];
const DEFAULT_ZOOM = 9;
const HIDDEN_BOUNDARY_LAYER_IDS = ["boundary_2", "boundary_disputed"];
const RUSSIAN_MAP_LABEL_FIELD = ["coalesce", ["get", "name:ru"], ["get", "name_ru"], ""];
const MAP_FIT_PADDING = { top: 120, right: 120, bottom: 120, left: 120 };

function getMapRequestUrl(value) {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value, window.location.href);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function getMarkerStatusClass(activityStatus) {
  if (activityStatus === "active" || activityStatus === "archived") {
    return `tower-marker-${activityStatus}`;
  }
  return "tower-marker-passive";
}

function createTowerMarkerElement(postType, activityStatus, source, isSelected) {
  const element = document.createElement("div");
  element.className = [
    "tower-marker",
    getMarkerStatusClass(activityStatus),
    isSelected ? "tower-marker-selected" : "",
  ].filter(Boolean).join(" ");
  const root = createRoot(element);
  const Icon = source === "mosecom" ? Building2 : postType === "mobile" ? Truck : RadioTower;
  root.render(<Icon size={23} strokeWidth={2.2} aria-hidden="true" />);
  return { element, root };
}

function getPostsWithCoordinates(posts) {
  return posts.filter((post) => Number.isFinite(post.latitude) && Number.isFinite(post.longitude));
}

function getPostMapPoint(post) {
  return [post.longitude, post.latitude];
}

function getMapPointsKey(points) {
  return points.map(([longitude, latitude]) => `${longitude},${latitude}`).join("|");
}

function fitMapToPoints(map, points) {
  if (points.length === 1) {
    map.easeTo({ center: points[0], zoom: Math.max(map.getZoom(), 13), duration: 500 });
    return;
  }
  const bounds = points.reduce(
    (currentBounds, point) => currentBounds.extend(point),
    new maplibregl.LngLatBounds(points[0], points[0])
  );
  map.fitBounds(bounds, { padding: MAP_FIT_PADDING, maxZoom: 13, duration: 500 });
}

function getProfileFitPadding(map) {
  const canvas = map.getCanvas();
  if (canvas.clientWidth <= 640) {
    return {
      top: Math.round(canvas.clientHeight * 0.52),
      right: 32,
      bottom: 48,
      left: 32,
    };
  }
  return MAP_FIT_PADDING;
}

function focusPostOnMap(map, post) {
  map.flyTo({
    center: getPostMapPoint(post),
    zoom: Math.max(map.getZoom(), 15),
  });
}

function removeTowerMarkers(markerEntries) {
  markerEntries.forEach(({ marker, root }) => {
    marker.remove();
    queueMicrotask(() => root.unmount());
  });
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

export default function useMonitoringMap({
  monitoringPosts,
  selectedMonitoringPostId,
  onPostClick,
  concentrationMapFrame,
  concentrationMapEnabled = false,
  temperatureProfileFrame,
  temperatureProfileEnabled = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const fittedMapPointsKeyRef = useRef("");
  const onPostClickRef = useRef(onPostClick);
  const concentrationMapFrameRef = useRef(concentrationMapFrame);
  const concentrationMapEnabledRef = useRef(concentrationMapEnabled);
  const temperatureProfileFrameRef = useRef(temperatureProfileFrame);
  const temperatureProfileEnabledRef = useRef(temperatureProfileEnabled);
  const savedCameraRef = useRef(null);
  const fittedProfileHourRef = useRef(null);

  useEffect(() => {
    onPostClickRef.current = onPostClick;
  }, [onPostClick]);

  useEffect(() => {
    concentrationMapFrameRef.current = concentrationMapFrame;
  }, [concentrationMapFrame]);

  useEffect(() => {
    concentrationMapEnabledRef.current = concentrationMapEnabled;
  }, [concentrationMapEnabled]);

  useEffect(() => {
    temperatureProfileFrameRef.current = temperatureProfileFrame;
  }, [temperatureProfileFrame]);

  useEffect(() => {
    temperatureProfileEnabledRef.current = temperatureProfileEnabled;
  }, [temperatureProfileEnabled]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const recentRequests = [];
    let map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
        transformRequest: (url, resourceType) => {
          recentRequests.push({ type: resourceType, url: getMapRequestUrl(url) });
          if (recentRequests.length > 6) {
            recentRequests.shift();
          }
          return { url };
        },
      });
    } catch (error) {
      console.error("[Карта] Ошибка создания карты:", error);
      return;
    }
    mapRef.current = map;

    map.on("error", ({ error }) => {
      const url = getMapRequestUrl(error?.url);
      console.error("[Карта] Ошибка MapLibre:", {
        message: error?.message ?? String(error),
        ...(url ? { url } : {}),
        ...(Number.isFinite(error?.status) ? { status: error.status } : {}),
        ...(!url && /fetch|network|load failed/i.test(error?.message ?? "")
          ? { recentRequests: [...recentRequests] }
          : {}),
      }, error);
    });
    map.on("webglcontextlost", () => {
      console.error("[Карта] Контекст WebGL потерян");
    });
    map.on("webglcontextrestored", () => {
      console.info("[Карта] Контекст WebGL восстановлен");
    });
    let hasLoaded = false;
    map.on("load", () => {
      hasLoaded = true;
      hidePoliticalBoundaries(map);
      applyRussianMapLabels(map);
      updateConcentrationMap(
        map,
        concentrationMapFrameRef.current,
        concentrationMapEnabledRef.current
      );
      updateTemperatureProfileLayer(
        map,
        temperatureProfileFrameRef.current,
        temperatureProfileEnabledRef.current
      );
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    const loadTimer = window.setTimeout(() => {
      if (!hasLoaded) {
        console.warn("[Карта] Загрузка длится более 15 секунд", {
          styleLoaded: Boolean(map.isStyleLoaded()),
          hasPendingTiles: !map.areTilesLoaded(),
          recentRequests: [...recentRequests],
        });
      }
    }, 15_000);

    return () => {
      window.clearTimeout(loadTimer);
      removeTowerMarkers(markersRef.current);
      markersRef.current = [];
      removeTemperatureProfileLayer(map);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      updateConcentrationMap(map, concentrationMapFrame, concentrationMapEnabled);
    }
  }, [concentrationMapFrame, concentrationMapEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      updateTemperatureProfileLayer(map, temperatureProfileFrame, temperatureProfileEnabled);
    }
  }, [temperatureProfileFrame, temperatureProfileEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (temperatureProfileEnabled && savedCameraRef.current === null) {
      savedCameraRef.current = {
        center: map.getCenter().toArray(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
      map.easeTo({ pitch: 60, bearing: -25, duration: 700 });
      return;
    }
    if (!temperatureProfileEnabled && savedCameraRef.current !== null) {
      map.easeTo({ ...savedCameraRef.current, duration: 700 });
      savedCameraRef.current = null;
      fittedProfileHourRef.current = null;
    }
  }, [temperatureProfileEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    const hourStart = temperatureProfileFrame?.hour_start;
    if (
      !map ||
      !temperatureProfileEnabled ||
      !hourStart ||
      fittedProfileHourRef.current === hourStart
    ) {
      return;
    }
    const points = (temperatureProfileFrame.stations ?? [])
      .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
      .map((station) => [station.longitude, station.latitude]);
    if (!points.length) {
      fittedProfileHourRef.current = hourStart;
      return;
    }
    const bounds = points.reduce(
      (currentBounds, point) => currentBounds.extend(point),
      new maplibregl.LngLatBounds(points[0], points[0])
    );
    map.fitBounds(bounds, {
      padding: getProfileFitPadding(map),
      maxZoom: 9.5,
      pitch: 60,
      bearing: -25,
      duration: 700,
    });
    fittedProfileHourRef.current = hourStart;
  }, [temperatureProfileEnabled, temperatureProfileFrame]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    removeTowerMarkers(markersRef.current);
    markersRef.current = [];

    const postsWithCoordinates = getPostsWithCoordinates(monitoringPosts);
    let visiblePostIds = null;
    if (temperatureProfileEnabled) {
      visiblePostIds = new Set(
        (temperatureProfileFrame?.stations ?? []).map((station) => station.monitoring_post_id)
      );
    } else if (concentrationMapEnabled) {
      visiblePostIds = new Set(concentrationMapFrame?.monitoring_post_ids ?? []);
    }
    const visiblePosts = visiblePostIds === null
      ? postsWithCoordinates
      : postsWithCoordinates.filter((post) => visiblePostIds.has(post.id));
    const points = postsWithCoordinates.map(getPostMapPoint);
    const pointsKey = getMapPointsKey(points);
    if (pointsKey && pointsKey !== fittedMapPointsKeyRef.current) {
      fitMapToPoints(mapRef.current, points);
      fittedMapPointsKeyRef.current = pointsKey;
    }
    visiblePosts.forEach((post) => {
      const { element, root } = createTowerMarkerElement(
        post.post_type,
        post.activity_status,
        post.source,
        post.id === selectedMonitoringPostId
      );
      element.title = `${getPostTitle(post)}${post.source === "mosecom" ? " · Мосэкомониторинг" : ""}`;
      element.addEventListener("click", () => {
        focusPostOnMap(mapRef.current, post);
        onPostClickRef.current?.(post);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([post.longitude, post.latitude])
        .addTo(mapRef.current);

      markersRef.current.push({ marker, root });
    });
  }, [
    monitoringPosts,
    selectedMonitoringPostId,
    concentrationMapEnabled,
    concentrationMapFrame,
    temperatureProfileEnabled,
    temperatureProfileFrame,
  ]);

  const focusPost = (post) => {
    if (Number.isFinite(post.latitude) && Number.isFinite(post.longitude) && mapRef.current) {
      focusPostOnMap(mapRef.current, post);
    }
  };

  const fitToPosts = (posts) => {
    if (!mapRef.current) {
      return;
    }
    const points = getPostsWithCoordinates(posts).map(getPostMapPoint);
    if (points.length) {
      fitMapToPoints(mapRef.current, points);
    }
  };

  return {
    mapContainerRef,
    focusPost,
    fitToPosts,
  };
}

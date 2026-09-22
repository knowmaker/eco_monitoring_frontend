import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { RadioTower, Truck } from "lucide-react";
import maplibregl from "maplibre-gl";

import { getPostTitle } from "../../domain/monitoringPosts";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [37.6173, 55.7558];
const DEFAULT_ZOOM = 9;
const HIDDEN_BOUNDARY_LAYER_IDS = ["boundary_2", "boundary_disputed"];
const RUSSIAN_MAP_LABEL_FIELD = ["coalesce", ["get", "name:ru"], ["get", "name_ru"], ""];
const MAP_FIT_PADDING = { top: 120, right: 120, bottom: 120, left: 120 };

function createTowerMarkerElement(postType, isActive) {
  const element = document.createElement("div");
  element.className = `tower-marker${isActive ? " tower-marker-active" : ""}`;
  const root = createRoot(element);
  const Icon = postType === "mobile" ? Truck : RadioTower;
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

function focusPostOnMap(map, post) {
  map.flyTo({
    center: getPostMapPoint(post),
    zoom: Math.max(map.getZoom(), 15),
  });
}

function removeTowerMarkers(markerEntries) {
  markerEntries.forEach(({ marker, root }) => {
    root.unmount();
    marker.remove();
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

export default function useMonitoringMap({ monitoringPosts, selectedMonitoringPostId, onPostClick }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const fittedMapPointsKeyRef = useRef("");
  const onPostClickRef = useRef(onPostClick);

  useEffect(() => {
    onPostClickRef.current = onPostClick;
  }, [onPostClick]);

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
    if (!mapRef.current) {
      return;
    }

    removeTowerMarkers(markersRef.current);
    markersRef.current = [];

    const postsWithCoordinates = getPostsWithCoordinates(monitoringPosts);
    const points = postsWithCoordinates.map(getPostMapPoint);
    const pointsKey = getMapPointsKey(points);
    if (pointsKey && pointsKey !== fittedMapPointsKeyRef.current) {
      fitMapToPoints(mapRef.current, points);
      fittedMapPointsKeyRef.current = pointsKey;
    }

    postsWithCoordinates.forEach((post) => {
      const { element, root } = createTowerMarkerElement(post.post_type, post.id === selectedMonitoringPostId);
      element.title = getPostTitle(post);
      element.addEventListener("click", () => {
        focusPostOnMap(mapRef.current, post);
        onPostClickRef.current?.(post);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([post.longitude, post.latitude])
        .addTo(mapRef.current);

      markersRef.current.push({ marker, root });
    });
  }, [monitoringPosts, selectedMonitoringPostId]);

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

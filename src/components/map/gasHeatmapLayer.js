const HEATMAP_SOURCE_ID = "gas-heatmap-source";
const HEATMAP_LAYER_ID = "gas-heatmap-layer";
const HEATMAP_POINTS_LAYER_ID = "gas-heatmap-points";

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function createHeatmapGeoJson(frame) {
  const points = (frame?.points ?? []).filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Number.isFinite(point.value)
  );
  const values = points.map((point) => point.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;

  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
      properties: {
        value: point.value,
        normalized: (point.value - min) / span,
      },
    })),
  };
}

export function initializeGasHeatmap(map) {
  if (!map.getSource(HEATMAP_SOURCE_ID)) {
    map.addSource(HEATMAP_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });
  }

  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  if (!map.getLayer(HEATMAP_LAYER_ID)) {
    map.addLayer(
      {
        id: HEATMAP_LAYER_ID,
        type: "heatmap",
        source: HEATMAP_SOURCE_ID,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "normalized"], 0, 0.2, 1, 1],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            0.8,
            14,
            2.1,
            18,
            1.5,
            22,
            1.25,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            30,
            12,
            62,
            14,
            82,
            16,
            110,
            17,
            220,
            18,
            360,
            20,
            640,
            22,
            900,
          ],
          "heatmap-opacity": 0.78,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(44,123,182,0)",
            0.15,
            "rgba(171,217,233,0.35)",
            0.35,
            "#74add1",
            0.55,
            "#ffffbf",
            0.75,
            "#fdae61",
            1,
            "#d7191c",
          ],
        },
      },
      firstSymbolLayer
    );
  }

  if (!map.getLayer(HEATMAP_POINTS_LAYER_ID)) {
    map.addLayer({
      id: HEATMAP_POINTS_LAYER_ID,
      type: "circle",
      source: HEATMAP_SOURCE_ID,
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "normalized"],
          0,
          "#2c7bb6",
          0.5,
          "#ffffbf",
          1,
          "#d7191c",
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }
}

export function updateGasHeatmap(map, frame, enabled) {
  if (!map.isStyleLoaded()) {
    return;
  }

  initializeGasHeatmap(map);
  map.getSource(HEATMAP_SOURCE_ID).setData(
    enabled && frame ? createHeatmapGeoJson(frame) : emptyFeatureCollection()
  );
}

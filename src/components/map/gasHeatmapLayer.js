import { GAS_HEATMAP_MAX_VALUE, GAS_HEATMAP_MIN_VALUE } from "../../domain/gasHeatmap";


const HEATMAP_SOURCE_ID = "gas-heatmap-source";
const HEATMAP_LAYER_ID = "gas-heatmap-layer";

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function createHeatmapGeoJson(frame) {
  const cells = (frame?.cells ?? []).filter(
    (cell) =>
      Number.isFinite(cell.south) &&
      Number.isFinite(cell.west) &&
      Number.isFinite(cell.north) &&
      Number.isFinite(cell.east) &&
      Number.isFinite(cell.value)
  );
  const span = GAS_HEATMAP_MAX_VALUE - GAS_HEATMAP_MIN_VALUE;

  return {
    type: "FeatureCollection",
    features: cells.map((cell) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [cell.west, cell.south],
          [cell.east, cell.south],
          [cell.east, cell.north],
          [cell.west, cell.north],
          [cell.west, cell.south],
        ]],
      },
      properties: {
        value: cell.value,
        normalized: Math.min(
          1,
          Math.max(0, (cell.value - GAS_HEATMAP_MIN_VALUE) / span)
        ),
        confidence: Number.isFinite(cell.confidence) ? cell.confidence : 0,
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
        type: "fill",
        source: HEATMAP_SOURCE_ID,
        paint: {
          "fill-antialias": false,
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "normalized"],
            0,
            "#2c7bb6",
            0.25,
            "#74add1",
            0.5,
            "#ffffbf",
            0.75,
            "#fdae61",
            1,
            "#d7191c",
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "confidence"],
            0,
            0,
            0.2,
            0.18,
            0.6,
            0.55,
            1,
            0.78,
          ],
        },
      },
      firstSymbolLayer
    );
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

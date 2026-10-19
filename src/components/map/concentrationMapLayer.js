import { buildUrl } from "../../api/client";


const CONCENTRATION_MAP_SOURCE_ID = "concentration-map-source";
const CONCENTRATION_MAP_LAYER_ID = "concentration-map-layer";

function removeConcentrationMap(map) {
  if (map.getLayer(CONCENTRATION_MAP_LAYER_ID)) {
    map.removeLayer(CONCENTRATION_MAP_LAYER_ID);
  }
  if (map.getSource(CONCENTRATION_MAP_SOURCE_ID)) {
    map.removeSource(CONCENTRATION_MAP_SOURCE_ID);
  }
}

export function updateConcentrationMap(map, frame, enabled) {
  if (!map.isStyleLoaded()) {
    return;
  }

  removeConcentrationMap(map);
  if (!enabled || !frame?.tile_url || !frame?.bounds || frame.cell_count <= 0) {
    return;
  }

  const { west, south, east, north } = frame.bounds;
  map.addSource(CONCENTRATION_MAP_SOURCE_ID, {
    type: "raster",
    tiles: [buildUrl(frame.tile_url)],
    tileSize: 256,
    bounds: [west, south, east, north],
    minzoom: 0,
    maxzoom: 18,
  });

  const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  map.addLayer(
    {
      id: CONCENTRATION_MAP_LAYER_ID,
      type: "raster",
      source: CONCENTRATION_MAP_SOURCE_ID,
      paint: {
        "raster-fade-duration": 0,
        "raster-resampling": "nearest",
      },
    },
    firstSymbolLayer
  );
}

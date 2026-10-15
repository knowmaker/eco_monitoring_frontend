export const GAS_HEATMAP_MIN_VALUE = 0;
export const GAS_HEATMAP_DEFAULT_MAX_VALUE = 1;

export function getGasHeatmapMaxValue(frame) {
  return Number.isFinite(frame?.pdk_max_once) && frame.pdk_max_once > 0
    ? frame.pdk_max_once
    : GAS_HEATMAP_DEFAULT_MAX_VALUE;
}

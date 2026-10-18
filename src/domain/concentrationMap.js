export const CONCENTRATION_MAP_MIN_VALUE = 0;
export const CONCENTRATION_MAP_DEFAULT_MAX_VALUE = 1;

export function getConcentrationMapMaxValue(frame) {
  return Number.isFinite(frame?.pdk_max_once) && frame.pdk_max_once > 0
    ? frame.pdk_max_once
    : CONCENTRATION_MAP_DEFAULT_MAX_VALUE;
}

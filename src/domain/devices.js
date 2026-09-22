export const DEVICE_TYPE_ORDER = ["gas", "dust", "meteo", "ivtm", "profile"];

export const DEVICE_TYPE_LABELS = {
  gas: "Газ",
  dust: "Пыль",
  meteo: "Метео",
  ivtm: "ИВТМ",
  profile: "Профиль",
};

export const GAS_SUBSTANCE_ORDER = ["NO2", "O3", "NO", "SO2", "CO", "H2S"];

export const DUST_METRIC_TABS = [
  { key: "pm1_concentration", label: "PM1" },
  { key: "pm2_concentration", label: "PM2.5" },
  { key: "pm10_concentration", label: "PM10" },
  { key: "tsp_concentration", label: "TSP" },
];

export const DUST_METRIC_KEYS = DUST_METRIC_TABS.map((item) => item.key);

export const METEO_WIND_KEY = "__meteo_wind__";

export const DEVICE_METRIC_TABS = {
  meteo: [
    { key: "air_temp", label: "Температура воздуха" },
    { key: "air_hum", label: "Влажность воздуха" },
    { key: "atm_press", label: "Давление" },
    { key: METEO_WIND_KEY, label: "Ветер" },
  ],
  ivtm: [
    { key: "sensor_ivtm_temp", label: "Температура ИВТМ" },
    { key: "sensor_ivtm_hum", label: "Влажность ИВТМ" },
  ],
};

export const METRIC_LABELS_BY_KEY = Object.fromEntries(
  [DUST_METRIC_TABS, ...Object.values(DEVICE_METRIC_TABS)]
    .flat()
    .map((item) => [item.key, item.label])
);

export function getMetricLabel(key) {
  return METRIC_LABELS_BY_KEY[key] || key;
}

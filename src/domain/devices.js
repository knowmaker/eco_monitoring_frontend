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
  { key: "pm1_concentration", label: "PM1", yAxisName: "Концентрация, мг/м³" },
  { key: "pm2_concentration", label: "PM2.5", yAxisName: "Концентрация, мг/м³" },
  { key: "pm10_concentration", label: "PM10", yAxisName: "Концентрация, мг/м³" },
  { key: "tsp_concentration", label: "TSP", yAxisName: "Концентрация, мг/м³" },
];

export const DUST_METRIC_KEYS = DUST_METRIC_TABS.map((item) => item.key);

export const METEO_WIND_KEY = "__meteo_wind__";

export const DEVICE_METRIC_TABS = {
  meteo: [
    { key: "air_temp", label: "Температура воздуха", yAxisName: "Температура, °C" },
    { key: "air_hum", label: "Влажность воздуха", yAxisName: "Влажность, %" },
    { key: "atm_press", label: "Давление", yAxisName: "Давление, мм рт. ст." },
    { key: METEO_WIND_KEY, label: "Ветер" },
  ],
  ivtm: [
    { key: "sensor_ivtm_temp", label: "Температура ИВТМ", yAxisName: "Температура, °C" },
    { key: "sensor_ivtm_hum", label: "Влажность ИВТМ", yAxisName: "Влажность, %" },
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

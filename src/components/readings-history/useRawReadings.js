import { useEffect, useMemo, useState } from "react";

import { DUST_METRIC_KEYS, METEO_WIND_KEY, getMetricLabel } from "../../domain/devices";
import {
  fetchDustStateRaw,
  fetchGasSensorsRaw,
  fetchIvtmStateRaw,
  fetchMeteoStateRaw,
} from "../../api";
import { applyGasPointValueCorrection } from "../../lib/gasValues";
import { isWindDirectionSeries, isWindSpeedSeries } from "./readingsUtils";

export default function useRawReadings({
  monitoringPostId,
  selectedDeviceType,
  selectedGasSubstance,
  selectedMetricKey,
  rawDrilldown,
  refreshCounter,
  isAuthenticated,
  day,
  month,
  viewMode,
  useGasAbsoluteValues = true,
}) {
  const [rawSeries, setRawSeries] = useState([]);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [rawErrorText, setRawErrorText] = useState("");

  useEffect(() => {
    setRawSeries([]);
    setRawErrorText("");
    setIsRawLoading(false);
  }, [monitoringPostId, selectedDeviceType, day, month, viewMode, selectedGasSubstance, selectedMetricKey, isAuthenticated]);

  useEffect(() => {
    if (!rawDrilldown || !monitoringPostId || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    setIsRawLoading(true);
    setRawErrorText("");
    setRawSeries([]);

    const loadRaw = async () => {
      if (selectedDeviceType === "gas") {
        const payload = await fetchGasSensorsRaw(monitoringPostId, rawDrilldown.start, rawDrilldown.end);
        if (cancelled) {
          return;
        }
        const substance = (payload.substances || []).find((item) => item.substance_code === selectedGasSubstance);
        setRawSeries(
          substance
            ? [
                {
                  key: selectedGasSubstance,
                  label: selectedGasSubstance,
                  points: applyGasPointValueCorrection(substance.points || [], useGasAbsoluteValues),
                },
              ]
            : []
        );
        return;
      }

      let payload;
      if (selectedDeviceType === "dust") {
        payload = await fetchDustStateRaw(monitoringPostId, rawDrilldown.start, rawDrilldown.end);
      } else if (selectedDeviceType === "meteo") {
        payload = await fetchMeteoStateRaw(monitoringPostId, rawDrilldown.start, rawDrilldown.end);
      } else if (selectedDeviceType === "ivtm") {
        payload = await fetchIvtmStateRaw(monitoringPostId, rawDrilldown.start, rawDrilldown.end);
      } else {
        payload = { series: [] };
      }

      if (cancelled) {
        return;
      }

      if (selectedDeviceType === "dust") {
        setRawSeries(
          DUST_METRIC_KEYS.map((key) => {
            const item = (payload.series || []).find((candidate) => candidate.key === key);
            return item ? { key: item.key, label: getMetricLabel(item.key), points: item.points || [] } : null;
          }).filter(Boolean)
        );
        return;
      }

      if (selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY) {
        const speed = (payload.series || []).find((item) => isWindSpeedSeries(item));
        const direction = (payload.series || []).find((item) => isWindDirectionSeries(item));
        setRawSeries(
          [
            speed ? { key: speed.key, label: "Скорость ветра", points: speed.points || [], yAxisIndex: 0 } : null,
            direction
              ? { key: direction.key, label: "Направление ветра", points: direction.points || [], yAxisIndex: 1 }
              : null,
          ].filter(Boolean)
        );
        return;
      }

      if (!selectedMetricKey || selectedMetricKey === METEO_WIND_KEY) {
        setRawSeries([]);
        return;
      }

      const item = (payload.series || []).find((candidate) => candidate.key === selectedMetricKey);
      setRawSeries(item ? [{ key: item.key, label: getMetricLabel(item.key), points: item.points || [] }] : []);
    };

    loadRaw()
      .catch((error) => {
        if (!cancelled) {
          setRawErrorText(error instanceof Error ? error.message : "Не удалось загрузить сырые данные");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRawLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    monitoringPostId,
    rawDrilldown,
    refreshCounter,
    isAuthenticated,
    selectedDeviceType,
    selectedGasSubstance,
    selectedMetricKey,
    useGasAbsoluteValues,
  ]);

  const rawWindDirectionSeries = useMemo(
    () => rawSeries.find((item) => isWindDirectionSeries(item)) ?? null,
    [rawSeries]
  );

  const rawWindSpeedSeries = useMemo(
    () => rawSeries.find((item) => isWindSpeedSeries(item)) ?? null,
    [rawSeries]
  );

  const rawWindTimestamps = useMemo(() => {
    const timestamps = new Set();
    [rawWindDirectionSeries, rawWindSpeedSeries].forEach((item) => {
      (item?.points || []).forEach((point) => {
        if (point.timestamp) {
          timestamps.add(point.timestamp);
        }
      });
    });
    return Array.from(timestamps).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [rawWindDirectionSeries, rawWindSpeedSeries]);

  const clearRawReadings = () => {
    setRawSeries([]);
    setRawErrorText("");
  };

  return {
    rawSeries,
    isRawLoading,
    rawErrorText,
    rawWindDirectionSeries,
    rawWindSpeedSeries,
    rawWindTimestamps,
    clearRawReadings,
  };
}

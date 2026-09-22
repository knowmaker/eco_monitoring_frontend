import { useEffect, useMemo, useState } from "react";

import {
  DEVICE_METRIC_TABS,
  DUST_METRIC_KEYS,
  GAS_SUBSTANCE_ORDER,
  METEO_WIND_KEY,
  getMetricLabel,
} from "../../domain/devices";
import {
  fetchDustStateHourly,
  fetchDustStateMonthly,
  fetchGasSensorsHourly,
  fetchGasSensorsMonthly,
  fetchIvtmStateHourly,
  fetchIvtmStateMonthly,
  fetchMeteoStateHourly,
  fetchMeteoStateMonthly,
  fetchProfileStateHourly,
  fetchProfileStateMonthly,
} from "../../api";
import { createEmptyPoints } from "./readingsUtils";

export default function useReadingsData({
  monitoringPostId,
  selectedDeviceType,
  day,
  month,
  viewMode,
  refreshCounter,
  axis,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [series, setSeries] = useState([]);
  const [gasSubstances, setGasSubstances] = useState([]);
  const [profileRecords, setProfileRecords] = useState([]);
  const [selectedGasSubstance, setSelectedGasSubstance] = useState(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState(null);

  const availableGasSubstanceCodes = useMemo(
    () =>
      GAS_SUBSTANCE_ORDER.filter((substanceCode) =>
        gasSubstances.some((item) => item.substance_code === substanceCode)
      ),
    [gasSubstances]
  );

  useEffect(() => {
    if (!monitoringPostId || !selectedDeviceType) {
      setSeries([]);
      setGasSubstances([]);
      setProfileRecords([]);
      setSelectedGasSubstance(null);
      setSelectedMetricKey(null);
      setErrorText("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorText("");
    setSeries([]);
    setGasSubstances([]);
    setProfileRecords([]);

    const load = async () => {
      const periodValue = viewMode === "month" ? month : day;

      if (selectedDeviceType === "gas") {
        const gasSensors =
          viewMode === "month"
            ? await fetchGasSensorsMonthly(monitoringPostId, periodValue)
            : await fetchGasSensorsHourly(monitoringPostId, periodValue);
        if (cancelled) {
          return;
        }

        const substances = gasSensors.substances || [];
        const availableSubstanceCodes = GAS_SUBSTANCE_ORDER.filter((substanceCode) =>
          substances.some((item) => item.substance_code === substanceCode)
        );
        setGasSubstances(substances);
        setSelectedGasSubstance((current) => {
          if (current && availableSubstanceCodes.includes(current)) {
            return current;
          }
          return availableSubstanceCodes[0] ?? null;
        });
        return;
      }

      if (selectedDeviceType === "profile") {
        const profileState =
          viewMode === "month"
            ? await fetchProfileStateMonthly(monitoringPostId, periodValue)
            : await fetchProfileStateHourly(monitoringPostId, periodValue);
        if (cancelled) {
          return;
        }

        setProfileRecords(profileState.profiles || []);
        return;
      }

      let payload;
      if (selectedDeviceType === "dust") {
        payload =
          viewMode === "month"
            ? await fetchDustStateMonthly(monitoringPostId, periodValue)
            : await fetchDustStateHourly(monitoringPostId, periodValue);
      } else if (selectedDeviceType === "meteo") {
        payload =
          viewMode === "month"
            ? await fetchMeteoStateMonthly(monitoringPostId, periodValue)
            : await fetchMeteoStateHourly(monitoringPostId, periodValue);
      } else if (selectedDeviceType === "ivtm") {
        payload =
          viewMode === "month"
            ? await fetchIvtmStateMonthly(monitoringPostId, periodValue)
            : await fetchIvtmStateHourly(monitoringPostId, periodValue);
      } else {
        payload = { series: [] };
      }

      if (!cancelled) {
        setSeries(payload.series || []);
      }
    };

    load()
      .catch((error) => {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Не удалось загрузить показания");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringPostId, selectedDeviceType, day, month, viewMode, refreshCounter]);

  useEffect(() => {
    if (selectedDeviceType !== "gas") {
      setSelectedGasSubstance(null);
    }
  }, [selectedDeviceType]);

  const metricTabs = useMemo(() => {
    if (selectedDeviceType === "gas" || selectedDeviceType === "profile") {
      return [];
    }
    return DEVICE_METRIC_TABS[selectedDeviceType] || [];
  }, [selectedDeviceType]);

  useEffect(() => {
    if (
      !monitoringPostId ||
      !selectedDeviceType ||
      selectedDeviceType === "gas" ||
      selectedDeviceType === "dust" ||
      selectedDeviceType === "profile"
    ) {
      setSelectedMetricKey(null);
      return;
    }

    const availableKeys = metricTabs.map((item) => item.key);
    setSelectedMetricKey((current) => {
      if (current && availableKeys.includes(current)) {
        return current;
      }
      return availableKeys[0] ?? null;
    });
  }, [monitoringPostId, selectedDeviceType, metricTabs]);

  const effectiveSeries = useMemo(() => {
    if (selectedDeviceType === "gas") {
      if (!selectedGasSubstance) {
        return [];
      }
      const substance = gasSubstances.find((s) => s.substance_code === selectedGasSubstance);
      return [
        {
          key: selectedGasSubstance,
          label: selectedGasSubstance,
          points: substance?.points || createEmptyPoints(axis.values, axis.key),
        },
      ];
    }

    if (selectedDeviceType === "dust") {
      return DUST_METRIC_KEYS.map((key) => {
        const item = series.find((candidate) => candidate.key === key);
        return item
          ? {
              key: item.key,
              label: getMetricLabel(item.key),
              points: item.points || createEmptyPoints(axis.values, axis.key),
            }
          : null;
      }).filter(Boolean);
    }

    if (selectedDeviceType === "profile") {
      return [];
    }

    if (!selectedMetricKey || selectedMetricKey === METEO_WIND_KEY) {
      return [];
    }
    const selectedSeries = series.find((s) => s.key === selectedMetricKey);
    return [
      {
        key: selectedMetricKey,
        label: getMetricLabel(selectedMetricKey),
        points: selectedSeries?.points || createEmptyPoints(axis.values, axis.key),
      },
    ];
  }, [selectedDeviceType, selectedGasSubstance, gasSubstances, selectedMetricKey, series, axis]);

  return {
    isLoading,
    errorText,
    series,
    effectiveSeries,
    profileRecords,
    availableGasSubstanceCodes,
    selectedGasSubstance,
    setSelectedGasSubstance,
    metricTabs,
    selectedMetricKey,
    setSelectedMetricKey,
  };
}

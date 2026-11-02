import { useEffect, useState } from "react";

import { fetchDustStateHourlyByMonth, fetchGasSensorsHourlyByMonth } from "../../api";

export default function useHourlyByMonthReadings({
  enabled,
  monitoringPostId,
  selectedDeviceType,
  month,
  refreshCounter,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [series, setSeries] = useState([]);

  useEffect(() => {
    if (!enabled || !monitoringPostId) {
      setSeries([]);
      setErrorText("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorText("");
    setSeries([]);

    const fetchHourlyByMonth = selectedDeviceType === "gas" ? fetchGasSensorsHourlyByMonth : fetchDustStateHourlyByMonth;
    fetchHourlyByMonth(monitoringPostId, month)
      .then((payload) => {
        if (!cancelled) {
          setSeries(selectedDeviceType === "gas" ? payload.substances : payload.series);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Не удалось загрузить распределение показаний");
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
  }, [enabled, monitoringPostId, selectedDeviceType, month, refreshCounter]);

  return { isHourlyByMonthLoading: isLoading, hourlyByMonthErrorText: errorText, hourlyByMonthSeries: series };
}

import { useEffect, useState } from "react";

import { fetchStationLatestHourlyReadings } from "../../api";

export default function useLatestReadings({ monitoringPostId, refreshCounter = 0 }) {
  const [latestReadings, setLatestReadings] = useState(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [latestErrorText, setLatestErrorText] = useState("");

  useEffect(() => {
    if (!monitoringPostId) {
      setLatestReadings(null);
      setLatestErrorText("");
      setIsLoadingLatest(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLatest(true);
    setLatestErrorText("");

    fetchStationLatestHourlyReadings(monitoringPostId)
      .then((payload) => {
        if (!cancelled) {
          setLatestReadings(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLatestReadings(null);
          setLatestErrorText(error instanceof Error ? error.message : "Не удалось загрузить последние показания");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLatest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringPostId, refreshCounter]);

  return {
    latestReadings,
    isLoadingLatest,
    latestErrorText,
  };
}

import { useEffect, useState } from "react";

import { fetchMonitoringPosts } from "../api";

export default function useMonitoringPosts({ isAdmin, refreshMs, reloadToken }) {
  const [monitoringPosts, setMonitoringPosts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMonitoringPosts = async () => {
      try {
        const incomingPosts = await fetchMonitoringPosts();
        if (cancelled) {
          return;
        }

        setMonitoringPosts(incomingPosts);
        setLoadError("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Не удалось получить станции");
      } finally {
        if (!cancelled) {
          setIsLoadingPosts(false);
        }
      }
    };

    loadMonitoringPosts();
    const intervalId = setInterval(loadMonitoringPosts, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isAdmin, refreshMs, reloadToken]);

  return {
    monitoringPosts,
    loadError,
    isLoadingPosts,
  };
}

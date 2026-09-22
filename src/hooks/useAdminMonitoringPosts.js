import { useCallback, useEffect, useState } from "react";

import { fetchMonitoringPostsAdmin } from "../api";

export default function useAdminMonitoringPosts({ isAdmin, activePanel, reloadToken }) {
  const [adminMonitoringPosts, setAdminMonitoringPosts] = useState([]);
  const [isLoadingAdminPosts, setIsLoadingAdminPosts] = useState(false);
  const [adminPostsError, setAdminPostsError] = useState("");

  const loadAdminMonitoringPosts = useCallback(async () => {
    if (!isAdmin) {
      setAdminMonitoringPosts([]);
      setAdminPostsError("");
      setIsLoadingAdminPosts(false);
      return;
    }

    setIsLoadingAdminPosts(true);
    setAdminPostsError("");
    try {
      const incomingPosts = await fetchMonitoringPostsAdmin();
      setAdminMonitoringPosts(incomingPosts);
    } catch (error) {
      setAdminPostsError(error instanceof Error ? error.message : "Не удалось загрузить список станций");
    } finally {
      setIsLoadingAdminPosts(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminMonitoringPosts([]);
      setAdminPostsError("");
      setIsLoadingAdminPosts(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activePanel === "stations") {
      loadAdminMonitoringPosts();
    }
  }, [activePanel, loadAdminMonitoringPosts, reloadToken]);

  return {
    adminMonitoringPosts,
    isLoadingAdminPosts,
    adminPostsError,
    loadAdminMonitoringPosts,
  };
}

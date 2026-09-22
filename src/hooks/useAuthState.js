import { useCallback, useEffect, useState } from "react";

import { AUTH_IS_ADMIN_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY } from "../api";

export default function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const storedIsAdmin = localStorage.getItem(AUTH_IS_ADMIN_STORAGE_KEY) === "true";
    setIsAuthenticated(Boolean(token));
    setIsAdmin(Boolean(token) && storedIsAdmin);
  }, []);

  const applyAuthSuccess = useCallback(({ isAdmin: nextIsAdmin }) => {
    setIsAuthenticated(true);
    setIsAdmin(Boolean(nextIsAdmin));
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_IS_ADMIN_STORAGE_KEY);
    setIsAuthenticated(false);
    setIsAdmin(false);
  }, []);

  return {
    isAuthenticated,
    isAdmin,
    applyAuthSuccess,
    clearAuth,
  };
}

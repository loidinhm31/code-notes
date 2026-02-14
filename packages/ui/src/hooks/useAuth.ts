import { useEffect, useState, useCallback, useRef } from "react";
import { authService } from "@code-notes/ui/services";

export interface UseAuthOptions {
  /**
   * Skip initial auth check on mount.
   * Use this when tokens are provided externally (e.g., in embedded mode).
   * When true, the hook will assume authenticated state without calling the server.
   */
  skipInitialCheck?: boolean;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { skipInitialCheck = false } = options;

  const [isAuthenticated, setIsAuthenticated] = useState(skipInitialCheck);
  const [isLoading, setIsLoading] = useState(!skipInitialCheck);
  const [error, setError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const initialCheckDoneRef = useRef(skipInitialCheck);

  const checkAuthStatus = useCallback(async () => {
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsLoading(true);
    try {
      const status = await authService.getStatus();
      setIsAuthenticated(status.isAuthenticated);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check auth status",
      );
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout");
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      await authService.refreshToken();
      await checkAuthStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh token");
      setIsAuthenticated(false);
    }
  }, [checkAuthStatus]);

  useEffect(() => {
    if (initialCheckDoneRef.current) return;
    initialCheckDoneRef.current = true;
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    isAuthenticated,
    isLoading,
    error,
    checkAuthStatus,
    logout,
    refreshToken,
  };
};

import { getAuthService } from "../adapters/factory";
import type { AuthResponse, AuthStatus, SyncConfig } from "@code-notes/shared";

/**
 * Login with email and password
 */
export const login = (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  return getAuthService().login(email, password);
};

/**
 * Register a new user
 */
export const register = (
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  return getAuthService().register(username, email, password);
};

/**
 * Logout the current user
 */
export const logout = (): Promise<void> => {
  return getAuthService().logout();
};

/**
 * Get current authentication status
 */
export const getStatus = (): Promise<AuthStatus> => {
  return getAuthService().getStatus();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): Promise<boolean> => {
  return getAuthService().isAuthenticated();
};

/**
 * Refresh the access token
 */
export const refreshToken = (): Promise<void> => {
  return getAuthService().refreshToken();
};

/**
 * Configure sync settings (server URL, app ID, API key)
 */
export const configureSync = (config: SyncConfig): Promise<void> => {
  return getAuthService().configureSync(config);
};

/**
 * Get the current access token (if available)
 */
export const getAccessToken = (): Promise<string | null> => {
  return getAuthService().getAccessToken();
};

/**
 * Get all tokens (for sync service integration)
 */
export const getTokens = (): Promise<{
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}> => {
  return getAuthService().getTokens();
};

/**
 * Get current sync configuration (serverUrl, appId, apiKey)
 */
export const getSyncConfig = () => {
  return getAuthService().getSyncConfig();
};

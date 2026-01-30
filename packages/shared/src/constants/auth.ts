/**
 * Auth storage keys for localStorage - used for SSO across qm-center ecosystem.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "qm-center-access-token",
  REFRESH_TOKEN: "qm-center-refresh-token",
  USER_ID: "qm-center-user-id",
  APPS: "qm-center-apps",
  IS_ADMIN: "qm-center-is-admin",
  SERVER_URL: "qm-center-server-url",
  APP_ID: "qm-center-app-id",
  API_KEY: "qm-center-api-key",
} as const;

/**
 * Auth storage keys for localStorage - used for SSO across qm-hub ecosystem.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "qm-hub-access-token",
  REFRESH_TOKEN: "qm-hub-refresh-token",
  USER_ID: "qm-hub-user-id",
  APPS: "qm-hub-apps",
  IS_ADMIN: "qm-hub-is-admin",
  SERVER_URL: "qm-hub-server-url",
  APP_ID: "qm-hub-app-id",
  API_KEY: "qm-hub-api-key",
} as const;

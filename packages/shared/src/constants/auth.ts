/**
 * Auth storage keys for localStorage - used for SSO across glean-oak ecosystem.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "glean-oak-access-token",
  REFRESH_TOKEN: "glean-oak-refresh-token",
  USER_ID: "glean-oak-user-id",
  APPS: "glean-oak-apps",
  IS_ADMIN: "glean-oak-is-admin",
  SERVER_URL: "glean-oak-server-url",
  APP_ID: "glean-oak-app-id",
  API_KEY: "glean-oak-api-key",
} as const;

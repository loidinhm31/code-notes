import type {
  AuthResponse,
  AuthStatus,
  IAuthService,
  SyncConfig,
} from "@code-notes/shared";
import { AUTH_STORAGE_KEYS, env } from "@code-notes/shared";

function getDefaultBaseUrl(): string {
  return env.serverUrl;
}
function getDefaultAppId(): string {
  return env.appId;
}
function getDefaultApiKey(): string {
  return env.apiKey;
}

/**
 * Configuration for QmServerAuthAdapter
 */
export interface QmServerAuthConfig {
  baseUrl?: string;
  appId?: string;
  apiKey?: string;
}

/**
 * API response wrapper from qm-center-server
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Token storage keys - use centralized keys for SSO across qm-center ecosystem
 */
const STORAGE_KEYS = AUTH_STORAGE_KEYS;

/**
 * Shared adapter for auth APIs
 * Calls qm-center-server directly - works in both Tauri webview and browser
 * Stores tokens in localStorage
 */
export class QmServerAuthAdapter implements IAuthService {
  private baseUrl: string;
  private appId: string;
  private apiKey: string;

  // Cache for getStatus() to prevent multiple server calls
  private statusCache: AuthStatus | null = null;
  private statusCacheTimestamp: number = 0;
  private static STATUS_CACHE_TTL = 10000; // 10 seconds cache

  constructor(config?: QmServerAuthConfig) {
    this.baseUrl =
      config?.baseUrl ||
      this.getStoredValue(STORAGE_KEYS.SERVER_URL) ||
      getDefaultBaseUrl();
    this.appId =
      config?.appId ||
      this.getStoredValue(STORAGE_KEYS.APP_ID) ||
      getDefaultAppId();
    this.apiKey =
      config?.apiKey ||
      this.getStoredValue(STORAGE_KEYS.API_KEY) ||
      getDefaultApiKey();
  }

  private getStoredValue(key: string): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  }

  private setStoredValue(key: string, value: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  }

  private removeStoredValue(key: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  }

  private async post<TReq, TRes>(
    endpoint: string,
    request: TReq,
    includeAuth = false,
  ): Promise<TRes> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-App-Id": this.appId,
      "X-API-Key": this.apiKey,
    };

    if (includeAuth) {
      const token = await this.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check if response is wrapped in ApiResponse
    if ("success" in result) {
      const apiResponse = result as ApiResponse<TRes>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || "Unknown API error");
      }
      return apiResponse.data!;
    }

    return result as TRes;
  }

  private async get<TRes>(
    endpoint: string,
    includeAuth = false,
  ): Promise<TRes> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-App-Id": this.appId,
      "X-API-Key": this.apiKey,
    };

    if (includeAuth) {
      const token = await this.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if ("success" in result) {
      const apiResponse = result as ApiResponse<TRes>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || "Unknown API error");
      }
      return apiResponse.data!;
    }

    return result as TRes;
  }

  async configureSync(config: SyncConfig): Promise<void> {
    if (config.serverUrl) {
      this.baseUrl = config.serverUrl;
      this.setStoredValue(STORAGE_KEYS.SERVER_URL, config.serverUrl);
    }
    if (config.appId) {
      this.appId = config.appId;
      this.setStoredValue(STORAGE_KEYS.APP_ID, config.appId);
    }
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      this.setStoredValue(STORAGE_KEYS.API_KEY, config.apiKey);
    }
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const response = await this.post<
      { username: string; email: string; password: string },
      AuthResponse
    >("/api/v1/auth/register", { username, email, password });

    this.storeAuthData(response);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.post<
      { email: string; password: string },
      AuthResponse
    >("/api/v1/auth/login", { email, password });

    this.storeAuthData(response);
    this.invalidateStatusCache();
    return response;
  }

  async logout(): Promise<void> {
    this.removeStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.USER_ID);
    this.removeStoredValue(STORAGE_KEYS.APPS);
    this.removeStoredValue(STORAGE_KEYS.IS_ADMIN);
    this.invalidateStatusCache();
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.getStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await this.post<
        { refreshToken: string },
        { accessToken: string; refreshToken: string }
      >("/api/v1/auth/refresh", { refreshToken });

      this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
    } catch (error) {
      await this.logout();
      throw error;
    }
  }

  private invalidateStatusCache(): void {
    this.statusCache = null;
    this.statusCacheTimestamp = 0;
  }

  private isStatusCacheValid(): boolean {
    return (
      this.statusCache !== null &&
      Date.now() - this.statusCacheTimestamp <
        QmServerAuthAdapter.STATUS_CACHE_TTL
    );
  }

  async getStatus(): Promise<AuthStatus> {
    if (this.isStatusCacheValid()) {
      return this.statusCache!;
    }

    const accessToken = this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    if (!accessToken) {
      const status: AuthStatus = {
        isAuthenticated: false,
        serverUrl: this.baseUrl,
      };
      this.statusCache = status;
      this.statusCacheTimestamp = Date.now();
      return status;
    }

    if (this.isTokenExpired(accessToken)) {
      try {
        await this.refreshToken();
      } catch {
        const status: AuthStatus = {
          isAuthenticated: false,
          serverUrl: this.baseUrl,
        };
        this.statusCache = status;
        this.statusCacheTimestamp = Date.now();
        return status;
      }
    }

    try {
      const userInfo = await this.get<{
        userId: string;
        username: string;
        email: string;
        apps: string[];
        isAdmin: boolean;
      }>("/api/v1/auth/me", true);

      const status: AuthStatus = {
        isAuthenticated: true,
        userId: userInfo.userId,
        username: userInfo.username,
        email: userInfo.email,
        apps: userInfo.apps,
        isAdmin: userInfo.isAdmin,
        serverUrl: this.baseUrl,
      };
      this.statusCache = status;
      this.statusCacheTimestamp = Date.now();
      return status;
    } catch {
      const userId = this.getStoredValue(STORAGE_KEYS.USER_ID);
      const appsStr = this.getStoredValue(STORAGE_KEYS.APPS);
      const isAdminStr = this.getStoredValue(STORAGE_KEYS.IS_ADMIN);

      const status: AuthStatus = {
        isAuthenticated: !!userId,
        userId: userId || undefined,
        apps: appsStr ? JSON.parse(appsStr) : undefined,
        isAdmin: isAdminStr ? JSON.parse(isAdminStr) : undefined,
        serverUrl: this.baseUrl,
      };
      this.statusCache = status;
      this.statusCacheTimestamp = Date.now();
      return status;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isAuthenticated;
  }

  async getAccessToken(): Promise<string | null> {
    const token = this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    if (this.isTokenExpired(token)) {
      try {
        await this.refreshToken();
        return this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
      } catch {
        return null;
      }
    }

    return token;
  }

  private storeAuthData(response: AuthResponse): void {
    this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
    this.setStoredValue(STORAGE_KEYS.USER_ID, response.userId);
    if (response.apps) {
      this.setStoredValue(STORAGE_KEYS.APPS, JSON.stringify(response.apps));
    }
    if (response.isAdmin !== undefined) {
      this.setStoredValue(
        STORAGE_KEYS.IS_ADMIN,
        JSON.stringify(response.isAdmin),
      );
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      if (!exp) return false;

      const now = Math.floor(Date.now() / 1000);
      return exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Get all tokens for sync service integration.
   */
  async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    return {
      accessToken: this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN) ?? undefined,
      refreshToken:
        this.getStoredValue(STORAGE_KEYS.REFRESH_TOKEN) ?? undefined,
      userId: this.getStoredValue(STORAGE_KEYS.USER_ID) ?? undefined,
    };
  }

  /**
   * Save tokens from external source (e.g., when sync service refreshes tokens).
   */
  async saveTokensExternal(
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    this.setStoredValue(STORAGE_KEYS.USER_ID, userId);
  }
}

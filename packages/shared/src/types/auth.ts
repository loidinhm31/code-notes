export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  apps?: string[];
  isAdmin?: boolean;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  email?: string;
  apps?: string[];
  isAdmin?: boolean;
  serverUrl?: string;
}

export interface SyncConfig {
  serverUrl?: string;
  appId?: string;
  apiKey?: string;
}

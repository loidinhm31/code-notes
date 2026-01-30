import { AuthResponse, AuthStatus, SyncConfig } from "../types/auth";

/**
 * Auth service interface for user authentication
 * Implemented by platform-specific adapters
 */
export interface IAuthService {
  /**
   * Configure sync settings (server URL, app ID, API key)
   */
  configureSync(config: SyncConfig): Promise<void>;

  /**
   * Register a new user
   */
  register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse>;

  /**
   * Login with email and password
   */
  login(email: string, password: string): Promise<AuthResponse>;

  /**
   * Logout the current user
   */
  logout(): Promise<void>;

  /**
   * Refresh the access token
   */
  refreshToken(): Promise<void>;

  /**
   * Get current authentication status
   */
  getStatus(): Promise<AuthStatus>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get the current access token (if available)
   */
  getAccessToken(): Promise<string | null>;

  /**
   * Get all tokens (for sync service integration)
   * Allows sync adapter to get tokens from the auth service (single source of truth)
   */
  getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }>;

  /**
   * Save tokens from external source (e.g., when sync service refreshes tokens)
   * Optional - only needed for http adapter where sync may refresh tokens
   */
  saveTokensExternal?(
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<void>;
}

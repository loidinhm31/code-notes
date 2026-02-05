import type { AuthResponse, AuthStatus, SyncConfig } from "@code-notes/shared";
import { tauriInvoke } from "./tauriInvoke";
import type { IAuthService } from "@code-notes/ui/adapters/factory/interfaces";

export class TauriAuthAdapter implements IAuthService {
  async configureSync(config: SyncConfig): Promise<void> {
    await tauriInvoke<void>("auth_configure_sync", {
      serverUrl: config.serverUrl ?? null,
      appId: config.appId ?? null,
      apiKey: config.apiKey ?? null,
    });
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return tauriInvoke<AuthResponse>("auth_register", {
      username,
      email,
      password,
      appId: null,
      apiKey: null,
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return tauriInvoke<AuthResponse>("auth_login", { email, password });
  }

  async logout(): Promise<void> {
    await tauriInvoke<void>("auth_logout");
  }

  async refreshToken(): Promise<void> {
    await tauriInvoke<void>("auth_refresh_token");
  }

  async getStatus(): Promise<AuthStatus> {
    return tauriInvoke<AuthStatus>("auth_get_status");
  }

  async isAuthenticated(): Promise<boolean> {
    return tauriInvoke<boolean>("auth_is_authenticated");
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await tauriInvoke<string>("auth_get_access_token");
    } catch {
      return null;
    }
  }

  async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    try {
      const [accessToken, status] = await Promise.all([
        tauriInvoke<string>("auth_get_access_token"),
        tauriInvoke<AuthStatus>("auth_get_status"),
      ]);
      return {
        accessToken,
        refreshToken: undefined,
        userId: status.userId,
      };
    } catch {
      return {};
    }
  }
}

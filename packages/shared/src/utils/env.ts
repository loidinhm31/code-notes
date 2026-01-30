/**
 * Environment configuration interface
 */
export interface AppEnvironment {
  VITE_QM_SYNC_SERVER_URL: string;
  VITE_CODE_NOTES_APP_ID: string;
  VITE_CODE_NOTES_API_KEY: string;
  DEV: boolean;
  PROD: boolean;
  MODE: string;
}

/**
 * Default values for environment variables
 */
const ENV_DEFAULTS: Partial<AppEnvironment> = {
  VITE_QM_SYNC_SERVER_URL: "http://localhost:3000",
  VITE_CODE_NOTES_APP_ID: "code-notes",
  VITE_CODE_NOTES_API_KEY: "",
  DEV: false,
  PROD: true,
  MODE: "production",
};

/**
 * Environment manager for safe access to Vite environment variables
 */
class EnvironmentManager {
  private cachedEnv: Record<string, unknown> | null = null;

  /**
   * Get Vite environment object safely
   */
  private getViteEnv(): Record<string, unknown> | null {
    if (this.cachedEnv !== null) {
      return this.cachedEnv;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any).env;
      if (env && typeof env === "object") {
        this.cachedEnv = env;
        return env;
      }
    } catch {
      // Not in a Vite environment
    }

    return null;
  }

  /**
   * Get an environment variable with type safety
   */
  get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    const env = this.getViteEnv();

    if (env && key in env) {
      return env[key] as AppEnvironment[K];
    }

    return ENV_DEFAULTS[key] as AppEnvironment[K];
  }

  /**
   * Check if running in development mode
   */
  get isDev(): boolean {
    const env = this.getViteEnv();
    if (env) {
      return env.DEV === true || env.MODE === "development";
    }
    return false;
  }

  /**
   * Check if running in production mode
   */
  get isProd(): boolean {
    const env = this.getViteEnv();
    if (env) {
      return env.PROD === true || env.MODE === "production";
    }
    return true;
  }

  /**
   * Get the sync server URL
   */
  get serverUrl(): string {
    return this.get("VITE_QM_SYNC_SERVER_URL");
  }

  /**
   * Get the app ID
   */
  get appId(): string {
    return this.get("VITE_CODE_NOTES_APP_ID");
  }

  /**
   * Get the API key
   */
  get apiKey(): string {
    return this.get("VITE_CODE_NOTES_API_KEY");
  }
}

/**
 * Singleton environment manager instance
 */
export const env = new EnvironmentManager();

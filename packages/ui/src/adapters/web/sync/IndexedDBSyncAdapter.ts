/**
 * IndexedDB Sync Adapter
 *
 * Implements ISyncService for web applications using IndexedDB/Dexie.
 * Combines GleanOakClient and IndexedDBSyncStorage to provide full sync functionality.
 */

import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@code-notes/shared/types";
import {
  createSyncClientConfig,
  type HttpClientFn,
  GleanOakClient,
} from "@code-notes/shared";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";
import { getCurrentTimestamp } from "../database";
import { ISyncService } from "@code-notes/ui/adapters/factory/interfaces";

/**
 * Token provider function type.
 */
export type TokenProvider = () => Promise<{
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}>;

/**
 * Token saver function type.
 */
export type TokenSaver = (
  accessToken: string,
  refreshToken: string,
  userId: string,
) => Promise<void>;

/**
 * Sync config provider function type.
 */
export type SyncConfigProvider = () => {
  serverUrl: string;
  appId: string;
  apiKey: string;
};

export interface IndexedDBSyncAdapterConfig {
  getConfig: SyncConfigProvider;
  httpClient?: HttpClientFn;
  getTokens: TokenProvider;
  saveTokens?: TokenSaver;
}

/**
 * ISyncService implementation for IndexedDB.
 */
export class IndexedDBSyncAdapter implements ISyncService {
  private client: GleanOakClient | null = null;
  private storage: IndexedDBSyncStorage;
  private config: IndexedDBSyncAdapterConfig;
  private initialized = false;
  private lastConfigHash: string = "";

  constructor(config: IndexedDBSyncAdapterConfig) {
    this.config = config;
    this.storage = new IndexedDBSyncStorage();
  }

  private getConfigHash(config: {
    serverUrl: string;
    appId: string;
    apiKey: string;
  }): string {
    return `${config.serverUrl}|${config.appId}|${config.apiKey}`;
  }

  private ensureClient(): GleanOakClient {
    const config = this.config.getConfig();
    const hash = this.getConfigHash(config);

    if (!this.client || hash !== this.lastConfigHash) {
      // Config changed, recreate client
      const clientConfig = createSyncClientConfig(
        config.serverUrl,
        config.appId,
        config.apiKey,
      );
      this.client = new GleanOakClient(clientConfig, this.config.httpClient);
      this.lastConfigHash = hash;
      this.initialized = false;
      // Write rotated tokens back to persistent storage immediately so the
      // next syncWithProgress() load doesn't overwrite them with stale values.
      if (this.config.saveTokens) {
        const client = this.client;
        client.setOnTokenRefresh((at, rt) => {
          this.config.saveTokens!(at, rt, client.getUserId() ?? "").catch(
            (e) => console.error("[IndexedDBSyncAdapter] Failed to save refreshed tokens:", e),
          );
        });
      }
    }

    return this.client;
  }

  /**
   * Initialize the adapter by getting tokens from auth service.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = this.ensureClient();
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      client.setTokens(accessToken, refreshToken, userId);
    }

    this.initialized = true;
  }

  /**
   * Login and store tokens.
   */
  async login(email: string, password: string): Promise<void> {
    const client = this.ensureClient();
    const auth = await client.login(email, password);
    if (this.config.saveTokens) {
      await this.config.saveTokens(
        auth.accessToken,
        auth.refreshToken,
        auth.userId,
      );
    }
  }

  /**
   * Register and store tokens.
   */
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<void> {
    const client = this.ensureClient();
    const auth = await client.register(username, email, password);
    if (this.config.saveTokens) {
      await this.config.saveTokens(
        auth.accessToken,
        auth.refreshToken,
        auth.userId,
      );
    }
  }

  /**
   * Logout.
   */
  async logout(): Promise<void> {
    const client = this.ensureClient();
    client.logout();
    this.initialized = false;
  }

  /**
   * Check if authenticated.
   */
  isAuthenticated(): boolean {
    const client = this.ensureClient();
    return client.isAuthenticated();
  }

  // =========================================================================
  // ISyncService Implementation
  // =========================================================================

  async syncNow(): Promise<SyncResult> {
    // Call syncWithProgress with a no-op callback for backwards compatibility
    return this.syncWithProgress(() => {});
  }

  async syncWithProgress(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    // Ensure client is up-to-date with current config
    const client = this.ensureClient();

    // Always refresh tokens before syncing
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      client.setTokens(accessToken, refreshToken, userId);
    }
    this.initialized = true;

    if (!client.isAuthenticated()) {
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: "Not authenticated",
        syncedAt: getCurrentTimestamp(),
      };
    }

    try {
      const pendingChanges = await this.storage.getPendingChanges();
      const checkpoint = await this.storage.getCheckpoint();

      const response = await client.delta(pendingChanges, checkpoint);

      let pushed = 0;
      let pulled = 0;
      let conflicts = 0;

      if (response.push) {
        pushed = response.push.synced;
        conflicts = response.push.conflicts.length;

        if (pushed > 0) {
          const syncedIds = pendingChanges.map((r) => ({
            tableName: r.tableName,
            rowId: r.rowId,
          }));
          await this.storage.markSynced(syncedIds);
        }

        // Emit progress after push phase
        onProgress({
          phase: "pushing",
          recordsPushed: pushed,
          recordsPulled: 0,
          hasMore: response.pull?.hasMore ?? false,
          currentPage: 0,
        });
      }

      if (response.pull) {
        // Collect ALL records from ALL pages first to ensure proper ordering
        const allRecords = [...response.pull.records];
        pulled = allRecords.length;

        // Auto-continue pulling while hasMore is true
        let currentCheckpoint = response.pull.checkpoint;
        let hasMore = response.pull.hasMore;
        let page = 1;

        // Emit progress after initial pull
        onProgress({
          phase: "pulling",
          recordsPushed: pushed,
          recordsPulled: pulled,
          hasMore: hasMore ?? false,
          currentPage: page,
        });

        while (hasMore) {
          page++;
          console.log("Pulling more records, checkpoint:", currentCheckpoint);

          const pullResponse = await client.pull(currentCheckpoint);

          // Collect records from this page
          allRecords.push(...pullResponse.records);
          pulled += pullResponse.records.length;

          currentCheckpoint = pullResponse.checkpoint;
          hasMore = pullResponse.hasMore ?? false;

          // Emit progress after each page
          onProgress({
            phase: "pulling",
            recordsPushed: pushed,
            recordsPulled: pulled,
            hasMore: hasMore ?? false,
            currentPage: page,
          });
        }

        // Apply ALL changes at once after collecting from all pages
        console.log(
          `Applying ${allRecords.length} total records from ${page} pages`,
        );
        if (allRecords.length > 0) {
          await this.storage.applyRemoteChanges(allRecords);
        }

        await this.storage.saveCheckpoint(currentCheckpoint);
      }

      const syncedAt = getCurrentTimestamp();
      await this.storage.saveLastSyncAt(syncedAt);

      return {
        pushed,
        pulled,
        conflicts,
        success: true,
        syncedAt,
      };
    } catch (error) {
      console.error("Sync failed:", error);
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        syncedAt: getCurrentTimestamp(),
      };
    }
  }

  async getStatus(): Promise<SyncStatus> {
    await this.initialize();

    const client = this.ensureClient();
    const [pendingChanges, lastSyncAt] = await Promise.all([
      this.storage.getPendingChangesCount(),
      this.storage.getLastSyncAt(),
    ]);

    return {
      configured: true,
      authenticated: client.isAuthenticated(),
      lastSyncAt,
      pendingChanges,
      serverUrl: client.config.serverUrl,
    };
  }

  // =========================================================================
  // Storage Access
  // =========================================================================

  getStorage(): IndexedDBSyncStorage {
    return this.storage;
  }

  getClient(): GleanOakClient {
    return this.ensureClient();
  }
}

/**
 * Create a configured IndexedDBSyncAdapter.
 */
export function createIndexedDBSyncAdapter(
  config: IndexedDBSyncAdapterConfig,
): IndexedDBSyncAdapter {
  return new IndexedDBSyncAdapter(config);
}

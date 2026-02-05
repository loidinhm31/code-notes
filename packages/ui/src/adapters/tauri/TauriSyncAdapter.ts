import type { SyncResult, SyncStatus } from "@code-notes/shared";
import { tauriInvoke } from "./tauriInvoke";
import type { ISyncService } from "@code-notes/ui/adapters/factory/interfaces";
import { dispatchSyncDataChanged } from "@code-notes/ui/utils";

export class TauriSyncAdapter implements ISyncService {
  async syncNow(): Promise<SyncResult> {
    const result = await tauriInvoke<SyncResult>("sync_now");

    // Dispatch event to notify UI components
    if (result.success && (result.pulled > 0 || result.pushed > 0)) {
      dispatchSyncDataChanged({
        pulled: result.pulled,
        pushed: result.pushed,
        conflicts: result.conflicts,
      });
    }

    return result;
  }

  async getStatus(): Promise<SyncStatus> {
    return tauriInvoke<SyncStatus>("get_sync_status");
  }
}

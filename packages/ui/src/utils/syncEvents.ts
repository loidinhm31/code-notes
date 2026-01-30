/**
 * Sync Events Utility
 *
 * Simple event system using browser CustomEvents to notify UI components
 * when sync operations complete and data needs to be refreshed.
 */

export const SYNC_EVENTS = {
  DATA_CHANGED: "code-notes:sync:data-changed",
} as const;

export interface SyncDataChangedDetail {
  pulled: number;
  pushed: number;
  conflicts: number;
}

/**
 * Dispatch a data changed event after successful sync.
 * UI components should listen for this event and refresh their data.
 */
export function dispatchSyncDataChanged(detail: SyncDataChangedDetail): void {
  if (typeof window === "undefined") return;

  const event = new CustomEvent(SYNC_EVENTS.DATA_CHANGED, {
    detail,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

/**
 * Subscribe to sync data changed events.
 * Returns an unsubscribe function.
 */
export function onSyncDataChanged(
  callback: (detail: SyncDataChangedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SyncDataChangedDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(SYNC_EVENTS.DATA_CHANGED, handler);

  return () => {
    window.removeEventListener(SYNC_EVENTS.DATA_CHANGED, handler);
  };
}

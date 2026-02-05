// Platform detection utilities
export {
  isTauri,
  isWeb,
  isMobile,
  isDesktop,
  getPlatformName,
  hasNativeFileSystem,
  hasAuthSupport,
} from "./platform";

// Domain-specific loggers
export { serviceLogger } from "./loggers";

// Sync events
export {
  SYNC_EVENTS,
  dispatchSyncDataChanged,
  onSyncDataChanged,
  type SyncDataChangedDetail,
} from "./syncEvents";

// Only PlatformAdapter is needed for Tauri-specific platform services (openUrl)
// Data storage and sync now use IndexedDB (Web adapters) for both platforms
export * from "./PlatformAdapter";

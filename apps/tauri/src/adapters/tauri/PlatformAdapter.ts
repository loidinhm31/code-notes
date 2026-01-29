import { IPlatformServices } from "@code-notes/ui/platform";
import { openUrl } from "@tauri-apps/plugin-opener";
// TODO: Use tauri-plugin-store or similar for persistent storage
// For now, mocking with localStorage or implementing file-based storage if needed
// But ya-boom original implementation used Rust backend for storage (invokes)?
// The store wrapper uses `persist` middleware which defaults to localStorage.
// If using Tauri, we might want to map `storage` to a file store.

// Minimal implementation for now
export const tauriPlatform: IPlatformServices = {
    storage: {
        getItem: async (key) => localStorage.getItem(key),
        setItem: async (key, value) => localStorage.setItem(key, value),
        removeItem: async (key) => localStorage.removeItem(key),
    },
    openUrl: async (url) => {
        await openUrl(url);
    },
};

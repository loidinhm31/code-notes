import { IPlatformServices } from "@code-notes/ui/platform";

export const tauriPlatform: IPlatformServices = {
  storage: {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
    removeItem: async (key) => localStorage.removeItem(key),
  },
  openUrl: async (url) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await (Function(
        'return import("@tauri-apps/plugin-opener")',
      )() as Promise<any>);
      await mod.openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  },
};

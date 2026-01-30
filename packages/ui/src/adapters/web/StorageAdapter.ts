import { IPlatformServices } from "@code-notes/ui/platform";

export class LocalStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

export const webPlatform: IPlatformServices = {
  storage: new LocalStorageAdapter(),
  openUrl: async (url: string) => {
    window.open(url, "_blank");
  },
};

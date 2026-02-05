import { invoke } from "@tauri-apps/api/core";
import { serviceLogger } from "@code-notes/ui/utils";

export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  serviceLogger.tauri(command, args);
  const result = await invoke<T>(command, args);
  serviceLogger.tauriDebug(`${command} response`, result);
  return result;
}

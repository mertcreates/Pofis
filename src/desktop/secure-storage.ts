import type { SafeStorage } from "electron";

export function secureStorageAvailable(storage: Pick<SafeStorage, "isEncryptionAvailable" | "getSelectedStorageBackend">,
  platform = process.platform) {
  return storage.isEncryptionAvailable() &&
    (platform !== "linux" || !["basic_text", "unknown"].includes(storage.getSelectedStorageBackend()));
}

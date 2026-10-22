import type { SafeStorage } from "electron";

export function secureStorageAvailable(storage: Pick<SafeStorage, "isEncryptionAvailable" | "getSelectedStorageBackend">,
  platform = process.platform) {
  // macOS has Keychain support, but probing it synchronously can wait for user
  // consent after an ad-hoc signature changes. Actual encrypt/decrypt still fail
  // closed if access is denied; reading notification status must not prompt.
  if (platform === "darwin") return true;
  return storage.isEncryptionAvailable() &&
    (platform !== "linux" || !["basic_text", "unknown"].includes(storage.getSelectedStorageBackend()));
}

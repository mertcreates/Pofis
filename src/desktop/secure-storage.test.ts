import { expect, test } from "bun:test";
import { secureStorageAvailable } from "./secure-storage";

test("Linux Telegram bağlantısı yalnız gerçek anahtarlıkla saklanabilir", () => {
  for (const backend of ["basic_text", "unknown", "gnome_libsecret", "kwallet6"] as const) {
    expect(secureStorageAvailable({ isEncryptionAvailable: () => true, getSelectedStorageBackend: () => backend }, "linux"))
      .toBe(["gnome_libsecret", "kwallet6"].includes(backend));
  }
  expect(secureStorageAvailable({ isEncryptionAvailable: () => false, getSelectedStorageBackend: () => "gnome_libsecret" }, "linux")).toBe(false);
});

test("Windows ve macOS anahtarlık backend'ini sorgulamaz", () => {
  for (const platform of ["win32", "darwin"] as const) {
    expect(secureStorageAvailable({ isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => { throw Error("Linux only"); } }, platform)).toBe(true);
  }
});

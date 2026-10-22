import { test, expect } from "bun:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNotificationStore, emptyNotificationAccount } from "./notification-store";

test("sıralı atomik yazılar, hesap ayrımı ve bekleyen gönderimin belirsizliği korunur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-notifications-"));
  try {
    const store = createNotificationStore(directory);
    const account = "a".repeat(64);
    const value = emptyNotificationAccount();
    expect(await store.load(account)).toEqual(value);
    const first = store.save(account, value);
    value.preferences.reached.native = true;
    value.deliveries["2026-10-21:reached:native"] = { state: "pending", attempts: 1, retryAt: 0 };
    await Promise.all([first, store.save(account, value)]);
    const restored = await store.load(account);
    expect(restored.preferences.reached.native).toBe(true);
    expect(restored.deliveries["2026-10-21:reached:native"].state).toBe("unknown");
    expect((await store.load("b".repeat(64))).preferences.reached.native).toBe(false);
    expect(() => store.save("../outside", value)).toThrow();
    const invalid = "{ broken";
    await writeFile(join(directory, `${account}.json`), invalid);
    await expect(store.load(account)).rejects.toThrow("korunuyor");
    expect(await readFile(join(directory, `${account}.json`), "utf8")).toBe(invalid);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

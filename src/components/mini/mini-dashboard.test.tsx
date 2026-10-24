import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("Mini saniyeli hedefi korur; hata, bağlantısız ve yükleniyor durumlarını ayırır", () => {
  // Isolate hook fixtures from the rest of the suite's real React/data modules.
  const result = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "fixtures/dashboard.tsx")], {
    cwd: resolve(import.meta.dir, "../../.."), timeout: 10_000,
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  const views = JSON.parse(result.stdout.toString());
  expect(views.remaining.brand).toBe("Pofis");
  expect(views.remaining.target).toBe("16:00:17");
  expect(views.remaining.delta).toContain("17 sn");
  expect(views.remaining.duration).toBe("7 sa 59 dk 43 sn");
  for (const view of [views.equal, views.over]) {
    expect(view.summary).toContain("Bugünkü hedef tamamlandı.");
    expect(view.grid).toBe(0);
    expect(view.week).toBe(1);
    expect(view.open).toBe(1);
  }
  expect(views.over.summary).toContain("8 sa 1 sn");
  expect(views.weekComplete.weekNote).toBe("Haftalık hedef tamamlandı");
  expect(views.remaining.weekNote).toBe("");
  expect(views.uncertain.weekNote).toBe("Kayıtlarda belirsizlik var");
  expect(views.staleTarget.grid).toBe(1);
  expect(views.staleTarget.summary).toBe("");
  expect(views.uncertain.summary).toBe("");
  expect(views.leave.summary).toBe("Bugün planlı mesai yok.");
  expect(views.leave.grid).toBe(0);
  expect(views.leave.week).toBe(1);
  expect(views.unplannedWork.summary).toContain("8 sa 1 sn");
  expect(views.unplannedWork.summary).toContain("Bugün planlı mesai yok.");
  expect(views.storage.alert).toBe("Mesai planın okunamadı.");
  for (const view of [views.storage, views.failedReport, views.failedSession]) {
    expect(view.alert).not.toBe("");
    expect(view.status).toBe("");
    expect(view.open).toBe(1);
  }
  expect(views.disconnected.disconnected).toBe("PDKS bağlantısı yok");
  expect(views.loading.status).toBe("Mesai bilgileri hazırlanıyor…");
});

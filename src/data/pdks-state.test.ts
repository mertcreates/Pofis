import { expect, test } from "bun:test";
import type { Report } from "@/domain/report";
import { toRequestFailure } from "@/lib/pdks-failure";
import { initialPdksState, pdksReducer, type PdksState } from "./pdks-state";

const report: Report = {
  person: { id: "self", name: "Fixture", title: "", unit: "" },
  from: "2026-10-12", to: "2026-10-18", fetchedAt: "2026-10-17T08:00:00Z", passages: [],
};
const active: PdksState = { connected: true, busy: "", failure: null, report, stale: false, workPlanSession: null };

test("girişe dönüş yalnız bağlantısız giriş hatasını temizler; oturum veya raporu değiştirmez", () => {
  const failure = toRequestFailure({ code: "CONNECTION_FAILED", status: 502 }, "connect");
  const failed = pdksReducer(initialPdksState, { type: "failed", failure });
  expect(pdksReducer(failed, { type: "returned-to-login" })).toEqual({ ...failed, failure: null });
  expect(pdksReducer({ ...active, failure }, { type: "returned-to-login" })).toEqual({ ...active, failure });
  const sessionFailure = toRequestFailure({ code: "INTERNAL_ERROR", status: 500 }, "session");
  const unchecked = pdksReducer(initialPdksState, { type: "failed", failure: sessionFailure });
  expect(pdksReducer(unchecked, { type: "returned-to-login" })).toEqual(unchecked);
});

test("yanlış şifre mevcut oturumun raporunu veya bağlantısını iptal etmez", () => {
  const failure = toRequestFailure({ code: "AUTH_FAILED", status: 401 }, "connect");
  expect(pdksReducer(active, { type: "failed", failure })).toEqual({ ...active, failure });
  expect(pdksReducer(initialPdksState, { type: "failed", failure })).toMatchObject({ connected: false, busy: "", report: null });
});

test("doğrulanmamış 401 raporu korur ve tahmini durdurur; doğrulanmış oturum bitişi kişiyi temizler", () => {
  const malformed = toRequestFailure({ code: "INVALID_RESPONSE", status: 401 }, "report");
  const state = pdksReducer(active, { type: "failed", failure: malformed });
  expect(state).toMatchObject({ connected: true, report, stale: true, busy: "" });
  const expired = toRequestFailure({ code: "SESSION_EXPIRED", status: 401 }, "session");
  expect(pdksReducer(state, { type: "failed", failure: expired })).toEqual({ connected: false, report: null, stale: false, busy: "", failure: expired, workPlanSession: null });
});

test("yenileme hatası, yeniden deneme ve başarı rapor tazeliğini birlikte yönetir", () => {
  const failure = toRequestFailure({ code: "CONNECTION_FAILED", status: 502 }, "report");
  const failed = pdksReducer(active, { type: "failed", failure });
  const pending = pdksReducer(failed, { type: "started", operation: "report" });
  expect(pending).toMatchObject({ connected: true, report, stale: true, busy: "report", failure: null });
  expect(pdksReducer(pending, { type: "report-loaded", report })).toEqual(active);
  expect(pdksReducer({ ...initialPdksState, connected: true }, { type: "failed", failure }).stale).toBe(false);
});

test("çıkış hatası kendi işlemini ve raporu korur; başarılı çıkış kişi bilgisini kaldırır", () => {
  const failure = toRequestFailure({ code: "INTERNAL_ERROR", status: 500 }, "disconnect");
  const failed = pdksReducer(active, { type: "failed", failure });
  expect(failed).toEqual({ ...active, failure });
  expect(pdksReducer(failed, { type: "disconnected" })).toEqual({ ...initialPdksState, connected: false, busy: "" });
});

test("doğrulanmış farklı oturum plan bağlayıcısıyla birlikte eski raporu da temizler", () => {
  const first = "a".repeat(64), second = "b".repeat(64);
  const state = { ...active, workPlanSession: first };
  expect(pdksReducer(state, { type: "session-checked", connected: true, workPlanSession: first }))
    .toMatchObject({ report, workPlanSession: first });
  expect(pdksReducer(state, { type: "session-checked", connected: true, workPlanSession: second }))
    .toMatchObject({ report: null, stale: false, workPlanSession: second });
  expect(pdksReducer(state, { type: "disconnected" })).toMatchObject({ workPlanSession: null, report: null });
});

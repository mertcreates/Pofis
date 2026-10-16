import { expect, test } from "bun:test";
import { stateLabel } from "./labels";
import { presentReport } from "@/domain/report";
import { DEFAULT_WORK_PLAN } from "@/domain/rules/work-plan";
import { ui } from "@/lib/ui-text.js";

test("kayıt durumu tek rapor saatinden türetilir; etiket yalnız seçilmiş durumu sunar", () => {
  const report = {
    person: { id: "self", name: "Fixture", unit: "", title: "" },
    from: "2026-01-05",
    to: "2026-01-11",
    passages: [],
    fetchedAt: "2026-01-05T09:00:00Z",
  };
  const day = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    Date.parse("2026-01-05T12:00:00+03:00"),
    false,
  ).days[0];
  expect(stateLabel(day)).toBe(ui.awaitingEntry);
  const past = presentReport(
    report,
    DEFAULT_WORK_PLAN,
    Date.parse("2026-01-06T00:00:00+03:00"),
    false,
  ).days[0];
  expect(stateLabel(past)).toBe(ui.noRecord);
});

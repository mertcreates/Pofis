import { addDays, dateKey, sourceTimestamp, weekStart } from "@/domain/rules/calendar";
import { changeWeekPlan, emptyWorkPlans } from "@/domain/rules/work-plan";
import { REPORT_ACCESS } from "@/domain/rules/report-access";
import type { Report } from "@/domain/report";

export const desktopScenarios = [
  { id: "working", label: "Mesai sürüyor", time: "14:30:00" },
  { id: "near-goal", label: "Hedefe 1 dakika kaldı", time: "16:59:00" },
  { id: "overtime", label: "Hedef aşıldı", time: "17:30:00" },
  { id: "completed", label: "Mesai tamamlandı", time: "17:30:00" },
  { id: "leave", label: "İzinli gün", time: "14:30:00" },
  { id: "weekend", label: "Hafta sonu", time: "14:30:00" },
  { id: "no-entry", label: "Henüz giriş yok", time: "09:30:00" },
  { id: "uncertain", label: "Belirsiz geçişler", time: "14:30:00" },
] as const;

export type DesktopScenarioId = typeof desktopScenarios[number]["id"];

// Fixtures only supply inputs. Report, plan, duration and goal owners calculate all outcomes.
export function createScenarioFixture(id: DesktopScenarioId, realNow: number) {
  const scenario = desktopScenarios.find(value => value.id === id);
  if (!scenario) throw new Error("Bilinmeyen masaüstü senaryosu.");
  const week = weekStart(dateKey(realNow));
  const today = addDays(week, id === "weekend" ? 5 : 2);
  const at = sourceTimestamp(today, scenario.time)!;
  const end = sourceTimestamp(today, "23:59:59")!;
  let plans = emptyWorkPlans();
  if (id === "leave") plans = changeWeekPlan(plans, week, plans.defaultPlan, [], undefined, [2]);
  const passages: Report["passages"] = [];
  for (let day = 0; day < (id === "weekend" ? 5 : 2); day++) {
    const date = addDays(week, day);
    passages.push({ date, time: "09:00:00", direction: "in" }, { date, time: "17:00:00", direction: "out" });
  }
  if (id === "uncertain") {
    passages.push({ date: today, time: "09:00:00", direction: "out" }, { date: today, time: "13:00:00", direction: "out" });
  } else if (!["leave", "weekend", "no-entry"].includes(id)) {
    passages.push({ date: today, time: "09:00:00", direction: "in" });
    if (id === "completed") passages.push({ date: today, time: "17:00:00", direction: "out" });
  }
  return { at, end, plans, report(from: string, to: string, now: number): Report {
    return { person: { id: REPORT_ACCESS.person, name: `Senaryo · ${scenario.label}`, unit: "", title: "" },
      from, to, fetchedAt: new Date(now).toISOString(),
      passages: passages.filter(value => value.date >= from && value.date <= to) };
  } };
}

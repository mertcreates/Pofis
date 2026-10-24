import { mock } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useWorkPlans } from "@/data/use-work-plans";
import { useDemoNotifications } from "@/demo/use-notifications";

let onSection: (section: string) => void;
mock.module("../../shell/app-shell.js", () => ({
  default: (props: { onSection: typeof onSection; children: ReactNode }) => {
    onSection = props.onSection;
    return null;
  },
}));
const { DashboardView } = await import("../view");
const changes: string[] = [];
function Harness({ week }: { week: string }) {
  const workPlans = useWorkPlans(week, "demo");
  const notifications = useDemoNotifications();
  return <DashboardView now={Date.parse("2026-10-24T12:00:00+03:00")} week={week}
    onWeekChange={next => changes.push(next)} workPlans={workPlans}
    data={{ kind: "demo", firstWeek: "2026-09-21", capturedDate: "2026-10-24", refresh() {}, notifications,
      report: { from: week, to: week === "2026-10-12" ? "2026-10-18" : "2026-10-25",
        person: { id: "self", name: "Fixture", unit: "", title: "" },
        fetchedAt: "2026-10-24T09:00:00.000Z", passages: [] } }} />;
}

const result: Record<string, string[]> = {};
for (const week of ["2026-10-12", "2026-10-19"]) {
  for (const section of ["settings", "meals", "overview"]) {
    changes.length = 0;
    renderToStaticMarkup(<Harness week={week} />);
    onSection!(section);
    result[`${week}:${section}`] = [...changes];
  }
}
console.log(JSON.stringify(result));

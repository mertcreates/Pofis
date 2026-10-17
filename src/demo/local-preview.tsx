import { useState } from "react";
import { emptyWorkPlans, changeWeekPlan, changeDefaultPlan, resolveStoredPlan, resolveStoredTarget } from "@/domain/rules/work-plan";
import { defaultNotebookDate, pofiNotebookDates } from "@/domain/rules/notebook-calendar";
import { weekStart } from "@/domain/rules/calendar";
import type { Report } from "@/domain/report";
import { PlanEditor } from "@/components/plan-editor";
import Notebook from "@/components/pofi/notebook.js";
import Modal from "@/components/modal.js";
import { ui } from "@/lib/ui-text.js";

export function DemoLocalPreview({ scenario, today, notes }: {
  scenario: "plan-validation" | "plan-storage" | "notebook";
  today: string;
  notes: Report["pofiNotes"];
}) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState(emptyWorkPlans);
  const week = weekStart(today);
  const plan = resolveStoredPlan(plans, week);
  const text = ui.demo.notices;
  const notebook = scenario === "notebook";
  const notebookSection = ui.pofiRoom.sections.find(section => section.id === "notes")!;
  const unavailableDate = defaultNotebookDate(today, pofiNotebookDates(today,
    (notes ?? []).map(note => note.date.slice(5))));

  return <>
    <p className="demo-notice-help">{text.localHelp}</p>
    <p className="demo-notice-help">{notebook ? text.notebookHelp
      : scenario === "plan-storage" ? text.storageHelp : text.validationHelp}</p>
    <button className="demo-preview-open" type="button" onClick={() => setOpen(true)}>
      {notebook ? text.openNotebook : text.openPlan}
    </button>
    {open && (notebook ? <Modal title={notebookSection.heading!} description={notebookSection.subtitle}
      className="pofi-room-modal" onClose={() => setOpen(false)}>
      <Notebook today={today} notes={notes?.filter(note => note.date !== unavailableDate)} />
    </Modal>
      : <PlanEditor week={week} today={today} plan={plan} defaultPlan={plans.defaultPlan} days={[]}
        targetSeconds={resolveStoredTarget(plans, week)}
        special={Boolean(plans.weekOverrides[week])} ready
        error={scenario === "plan-storage" ? ui.storageWriteError : ""}
        onClose={() => setOpen(false)} onSave={(next, targetSeconds) => {
          if (scenario === "plan-storage") return false;
          setPlans(current => changeWeekPlan(current, week, next, [], targetSeconds));
          return true;
        }} onSaveDefault={next => {
          if (scenario === "plan-storage") return false;
          setPlans(current => changeDefaultPlan(current, next));
          return true;
        }} onReset={() => {
          if (scenario === "plan-storage") return false;
          setPlans(current => changeWeekPlan(current, week, null));
          return true;
        }} />)}
  </>;
}

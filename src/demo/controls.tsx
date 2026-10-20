"use client";

import type { ReactNode } from "react";
import { ui } from "@/lib/ui-text.js";

export type DemoView = "attendance" | "errors" | "notices";
export type ErrorPreviewState = {
  scenario: keyof typeof ui.demo.errors.scenarioLabels;
  login: boolean;
  attempt: number;
};

export const initialErrorPreview: ErrorPreviewState = {
  scenario: "connection", login: false, attempt: 0,
};

export function DemoControls({ view, onViewChange, onReset, children }: {
  view: DemoView;
  onViewChange: (view: DemoView) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const text = ui.demo.controls;
  return (
      <section className="demo-controls" aria-label={text.label}>
        <div className="demo-controls-heading">
          <div className="demo-controls-start">
            <div className="demo-view-switch" role="group" aria-label={text.viewsLabel}>
              {(["attendance", "errors", "notices"] as const).map(value => (
                <button key={value} type="button" aria-pressed={view === value}
                  onClick={() => onViewChange(value)}>{text.views[value]}</button>
              ))}
            </div>
          </div>
          <button className="demo-reset" type="button" onClick={onReset}>{text.reset}</button>
        </div>
        <div className="demo-controls-body">{children}</div>
      </section>
  );
}

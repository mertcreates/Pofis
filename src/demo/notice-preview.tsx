import { useMemo } from "react";
import RequestError from "@/components/request-error.js";
import { toRequestFailure } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";
import { InlineNotice } from "@/components/inline-notice";
import type { Report } from "@/domain/report";
import dynamic from "next/dynamic";

const DemoLocalPreview = dynamic(() => import("./local-preview").then(module => module.DemoLocalPreview));

export type NoticePreviewState = {
  scenario: keyof typeof ui.demo.notices.scenarios;
  attempt: number;
};

export const initialNoticePreview: NoticePreviewState = {
  scenario: "disconnect", attempt: 0,
};

export function DemoNoticeControls({ state, onChange }: {
  state: NoticePreviewState;
  onChange: (state: NoticePreviewState) => void;
}) {
  const text = ui.demo.notices;
  return <>
    <div className="demo-notice-controls">
      <label className="demo-control-select">
        <span>{text.scenario}</span>
        <select value={state.scenario} onChange={event => onChange({
          ...state, scenario: event.currentTarget.value as NoticePreviewState["scenario"], attempt: 0,
        })}>
          {(Object.keys(text.scenarios) as NoticePreviewState["scenario"][]).map(scenario => (
            <option key={scenario} value={scenario}>{text.scenarios[scenario]}</option>
          ))}
        </select>
      </label>
    </div>
    <p className="demo-notice-help">{text.notice}</p>
  </>;
}

export function DemoNoticePreview({ state, onChange, today, notes }: {
  state: NoticePreviewState;
  onChange: (state: NoticePreviewState) => void;
  today: string;
  notes: Report["pofiNotes"];
}) {
  const text = ui.demo.notices;
  const error = useMemo(() => {
    if (state.scenario !== "disconnect" && state.scenario !== "report") return null;
    return toRequestFailure({
      code: "CONNECTION_FAILED", status: 502,
      details: {
        apiPath: state.scenario === "disconnect" ? "/api/session" : "/api/report",
        apiMethod: state.scenario === "disconnect" ? "DELETE" : "GET",
        type: "PdksError", causeCode: "ETIMEDOUT",
        diagnostic: "PDKS isteği zaman aşımına uğradı.",
        occurredAt: new Date(Date.UTC(2026, 9, 17, 8, 34, 40) + state.attempt * 1000).toISOString(),
      },
    }, state.scenario);
  }, [state.scenario, state.attempt]);

  switch (state.scenario) {
    case "plan-validation":
    case "plan-storage":
    case "notebook":
      return <div className="demo-notice-preview"><DemoLocalPreview key={state.scenario}
        scenario={state.scenario} today={today} notes={notes} /></div>;
    case "stale":
      return <InlineNotice>{ui.staleReport}</InlineNotice>;
    case "theme-read":
      return <InlineNotice tone="warning">{ui.themeReadError}</InlineNotice>;
    case "theme-write":
      return <InlineNotice tone="warning">{ui.themeWriteError}</InlineNotice>;
    case "plan-read":
      return <InlineNotice tone="warning">{ui.storageReadError}</InlineNotice>;
    case "plan-write":
      return <InlineNotice tone="warning">{ui.storageWriteError}</InlineNotice>;
  }

  return <div className="demo-notice-preview">
    {error && <RequestError error={error} variant="notice"
      onRetry={() => onChange({ ...state, attempt: state.attempt + 1 })} />}
    {state.attempt > 0 && <p className="demo-notice-help" role="status">{text.attempts(state.attempt)}</p>}
  </div>;
}

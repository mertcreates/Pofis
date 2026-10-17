"use client";

import { useMemo, type ReactNode } from "react";
import type { ErrorPreviewState } from "./controls";
import AppShell from "@/components/shell/app-shell.js";
import { Connection } from "@/components/connection";
import RequestError from "@/components/request-error.js";
import { useAppearance } from "@/data/use-appearance";
import { toRequestFailure } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";
import { NotFoundState } from "@/components/not-found-state";

type Scenario = keyof typeof ui.demo.errors.scenarioLabels;

function sampleError(scenario: Scenario, attempt: number) {
  const details = {
    apiPath: "/api/session", apiMethod: "POST", type: "PdksError",
    occurredAt: new Date(Date.UTC(2026, 9, 17, 8, 34, 40) + attempt * 1000).toISOString(),
  };
  switch (scenario) {
    case "not-found": return null;
    case "runtime": return toRequestFailure({ code: "RUNTIME_ERROR", details: {
      diagnostic: ui.apiErrors.unexpectedServerError,
    } }, "runtime");
    case "connection": return toRequestFailure({ code: "CONNECTION_FAILED", status: 502, details: {
      ...details, method: "GET", path: "/PizzyKurumWeb/Giris.aspx",
      causeCode: "ENOTFOUND", diagnostic: "PDKS sunucusunun adresi çözümlenemedi.",
    } }, "connect");
    case "upstream": return toRequestFailure({ code: "SOURCE_ERROR", status: 502, details: {
      ...details, method: "GET", path: "/PizzyKurumWeb/Giris.aspx",
      sourceStatus: 500, diagnostic: "PDKS bir HTTP hata yanıtı verdi.",
    } }, "connect");
    case "internal": return toRequestFailure({ code: "INTERNAL_ERROR", status: 500, details: {
      ...details, type: "UnexpectedError", diagnostic: "Uygulama sunucusunda beklenmeyen bir hata oluştu.",
    } }, "connect");
  }
}

export function DemoErrorPreview({ state, onChange, controls }: {
  state: ErrorPreviewState;
  onChange: (state: ErrorPreviewState) => void;
  controls: (children: ReactNode) => ReactNode;
}) {
  const appearance = useAppearance();
  const { scenario, login, attempt } = state;
  const setLogin = (login: boolean) => onChange({ ...state, login });
  const error = useMemo(() => sampleError(scenario, attempt), [scenario, attempt]);
  const text = ui.demo.errors;

  return (
    <AppShell appearance={appearance}>
      <div className="demo-error-workbench">
        {controls(<div className="demo-error-toolbar">
          <label className="demo-control-select">
            <span>{text.scenario}</span>
            <select value={scenario} onChange={event => {
              onChange({ ...state, scenario: event.currentTarget.value as Scenario, login: false, attempt: 0 });
            }}>
              {(Object.keys(text.scenarioLabels) as Scenario[]).map(value => (
                <option value={value} key={value}>{text.scenarioLabels[value]}</option>
              ))}
            </select>
          </label>
          <p>{text.notice}</p>
        </div>)}
        {scenario === "not-found" ? <NotFoundState returnHref="/demo" /> : scenario === "runtime" && error ? <>
          <p className="demo-notice-help">{text.runtimeHelp}</p>
          <RequestError error={error} onRetry={() => onChange({ ...state, attempt: attempt + 1 })} />
          {attempt > 0 && <p role="status">{text.runtimeAttempts(attempt)}</p>}
        </> : login ? <div className="demo-error-login">
          <button type="button" onClick={() => setLogin(false)}>{text.replay}</button>
          <Connection busy={false} error={null} onRetry={() => setLogin(false)} onReturnToLogin={() => setLogin(true)}
            onConnect={async form => { form.reset(); onChange({ ...state, attempt: attempt + 1, login: false }); }} />
        </div> : (
          <>
            {error && <RequestError error={error} onReturnToLogin={() => setLogin(true)} />}
            {attempt > 0 && <p role="status">{text.attempts(attempt)}</p>}
          </>
        )}
      </div>
    </AppShell>
  );
}

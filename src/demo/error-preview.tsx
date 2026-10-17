"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/shell/app-shell.js";
import { Connection } from "@/components/connection";
import { RequestErrorDetails } from "@/components/request-error.js";
import { DemoErrorTrace } from "./error-trace";
import { presentPdksFailure } from "@/components/pdks-error-presentation";
import { useAppearance } from "@/data/use-appearance";
import { POFI_ASSETS } from "@/domain/rules/pofi.js";
import { toRequestFailure } from "@/lib/pdks-failure";
import { ui } from "@/lib/ui-text.js";
import Icon from "@/components/ui-icon.js";

type Design = keyof typeof ui.demo.errors.designs;
type Scenario = keyof typeof ui.demo.errors.scenarioLabels;

function sampleError(scenario: Scenario, attempt: number) {
  const details = {
    apiPath: "/api/session", apiMethod: "POST", type: "PdksError",
    occurredAt: new Date(Date.UTC(2026, 9, 17, 8, 34, 40) + attempt * 1000).toISOString(),
  };
  switch (scenario) {
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

export function DemoErrorPreview({ onClose }: { onClose: () => void }) {
  const appearance = useAppearance();
  const [design, setDesign] = useState<Design>("trace");
  const [scenario, setScenario] = useState<Scenario>("connection");
  const [login, setLogin] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const error = useMemo(() => sampleError(scenario, attempt), [scenario, attempt]);
  const presentation = presentPdksFailure(error);
  const text = ui.demo.errors;
  const message = (
    <div className="demo-error-message">
      <h1 id="demo-error-title">{presentation.title}</h1>
      <p>{presentation.message}</p>
      <div className="demo-error-actions">
        <button type="button" className="primary" onClick={() => setLogin(true)}>{ui.returnToLogin}<Icon name="arrow" /></button>
      </div>
      {attempt > 0 && <p className="demo-error-attempt" role="status">{text.attempts(attempt)}</p>}
    </div>
  );
  const diagnostics = (
    <div className={`demo-error-diagnostics demo-diagnostics-${design}`}>
      {design === "trace"
        ? <DemoErrorTrace key={`${scenario}-${attempt}`} error={error} />
        : <RequestErrorDetails key={`${design}-${scenario}-${attempt}`} error={error} initiallyOpen />}
    </div>
  );
  const pofi = <img className="demo-error-pofi" src={POFI_ASSETS.error} width="320" height="320" alt="" />;

  return (
    <AppShell appearance={appearance} showNavigation={false} onDisconnect={undefined} onSection={undefined}>
      <div className="demo-error-workbench">
        <div className="demo-error-toolbar">
          <div className="demo-error-toolbar-top">
            <strong>{text.launch}</strong>
            <button type="button" onClick={onClose}>{text.back}</button>
          </div>
          <p>{text.notice}</p>
          <div className="demo-error-controls">
            <div role="group" aria-label={text.design} className="demo-error-designs">
              {(Object.keys(text.designs) as Design[]).map(value => (
                <button type="button" key={value} aria-pressed={design === value}
                  onClick={() => { setDesign(value); setLogin(false); }}>
                  {text.designs[value].label}
                </button>
              ))}
            </div>
            <label className="demo-error-scenario">
              <span>{text.scenario}</span>
              <select value={scenario} onChange={event => {
                setScenario(event.currentTarget.value as Scenario); setLogin(false); setAttempt(0);
              }}>
                {(Object.keys(text.scenarioLabels) as Scenario[]).map(value => (
                  <option value={value} key={value}>{text.scenarioLabels[value]}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="demo-error-description" role="status">{text.designs[design].description}</p>
        </div>
        {appearance.error && <p role="alert">{appearance.error}</p>}
        {login ? <div className="demo-error-login">
          <button type="button" onClick={() => setLogin(false)}>{text.replay}</button>
          <Connection busy={false} error={null} onRetry={() => setLogin(false)} onReturnToLogin={() => setLogin(true)}
            onConnect={async form => { form.reset(); setAttempt(value => value + 1); setLogin(false); }} />
        </div> : (
          <section className="demo-error-scene demo-error-calm" aria-labelledby="demo-error-title">
            <div className="demo-error-hero">{message}<div className="demo-error-art">{pofi}</div></div>
            {diagnostics}
          </section>
        )}
      </div>
    </AppShell>
  );
}

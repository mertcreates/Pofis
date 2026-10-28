import { createRoot } from "react-dom/client";
import { usePdks } from "../use-pdks";
import { Connection } from "@/components/connection";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { useDesktopNotifications } from "../use-desktop-notifications";

const plans = JSON.stringify(emptyWorkPlans());

declare global {
  interface Window {
    rememberFixture: { state: ReturnType<typeof usePdks>; plans: string; notifications: ReturnType<typeof useDesktopNotifications> };
  }
}

function Fixture() {
  const state = usePdks("2026-10-19");
  const notifications = useDesktopNotifications(true, state.connected, state.busy === "connect" || state.busy === "disconnect", plans);
  window.rememberFixture = { state, plans, notifications };
  if (state.connected === null) return <p>Oturum kontrol ediliyor…</p>;
  if (state.connected) return <p id="fixture-connected">{state.report?.person.name ?? "Yükleniyor…"}</p>;
  return <Connection busy={!!state.busy} error={state.failure} onRetry={state.retryFailure}
    onReturnToLogin={state.returnToLogin} onConnect={state.connect} />;
}

createRoot(document.getElementById("root")!).render(<Fixture />);

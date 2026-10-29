import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { usePdks } from "../use-pdks";
import { Connection } from "@/components/connection";
import { MealMenuModal } from "@/components/meals/menu-modal";
import { emptyWorkPlans } from "@/domain/rules/work-plan";
import { useDesktopNotifications } from "../use-desktop-notifications";

const plans = JSON.stringify(emptyWorkPlans());

declare global {
  interface Window {
    rememberFixture: { state: ReturnType<typeof usePdks>; plans: string; notifications: ReturnType<typeof useDesktopNotifications>; openMeal: () => void };
  }
}

function Fixture() {
  const state = usePdks("2026-10-19");
  const [mealOpen, setMealOpen] = useState(false);
  const notifications = useDesktopNotifications(true, state.connected, state.busy === "connect" || state.busy === "disconnect", plans, state.workPlanSession);
  useEffect(() => { if (state.connected === false) setMealOpen(false); }, [state.connected]);
  window.rememberFixture = { state, plans, notifications, openMeal: () => setMealOpen(true) };
  if (state.connected === null) return <p>Oturum kontrol ediliyor…</p>;
  if (state.connected) return <>
    <p id="fixture-connected">{state.report?.person.name ?? "Yükleniyor…"}</p>
    {mealOpen && <MealMenuModal today="2026-10-20" onClose={() => setMealOpen(false)} onSessionExpired={state.verifySessionAfterExpiry} />}
  </>;
  return <Connection busy={!!state.busy} error={state.failure} onRetry={state.retryFailure}
    onReturnToLogin={state.returnToLogin} onConnect={state.connect} />;
}

createRoot(document.getElementById("root")!).render(<Fixture />);

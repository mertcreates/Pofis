import { scenarioTime } from "@/desktop/scenario-contract";

// The optional bridge exists only in the explicitly launched desktop scenario profile.
export function applicationNow() {
  return typeof window !== "undefined" && window.pofisScenario
    ? scenarioTime(window.pofisScenario.seed.clock, Date.now()) : Date.now();
}

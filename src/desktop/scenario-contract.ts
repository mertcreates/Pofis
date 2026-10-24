import type { WorkPlans } from "@/domain/rules/work-plan";

export type ScenarioClock = { at: number; end: number; startedAt: number };
export type ScenarioSeed = { revision: string; clock: ScenarioClock; plans: WorkPlans };
export type DesktopScenarioBridge = {
  readonly seed: ScenarioSeed;
  onRefresh(callback: () => void): () => void;
};

export function scenarioTime(clock: ScenarioClock, realNow: number) {
  return Math.min(clock.end, clock.at + Math.max(0, realNow - clock.startedAt));
}

declare global { interface Window { pofisScenario?: DesktopScenarioBridge } }

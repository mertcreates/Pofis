import { randomUUID } from "node:crypto";
import { createScenarioFixture, desktopScenarios, type DesktopScenarioId } from "@/demo/desktop-scenarios";
import { scenarioTime, type ScenarioSeed } from "./scenario-contract";
import * as reportAccess from "@/domain/rules/report-access";

export { desktopScenarios, reportAccess };
type Conditions = { offline: boolean; expired: boolean; slow: boolean };
export function createScenarioRuntime({ realNow = Date.now } = {}) {
  let id: DesktopScenarioId = "working";
  let fixture = createScenarioFixture(id, realNow());
  let clock = { at: fixture.at, end: fixture.end, startedAt: realNow() };
  let revision = randomUUID();
  let version = 0;
  let conditions: Conditions = { offline: false, expired: false, slow: false };
  const now = () => scenarioTime(clock, realNow());
  const session = () => ({ accountId: "e".repeat(64), expiresAt: fixture.end + 86400000 });
  const state = () => ({ id, version, conditions: { ...conditions } });
  const snapshot = (): ScenarioSeed & { id: DesktopScenarioId; version: number; conditions: Conditions } => ({
    ...state(), revision, clock: { ...clock }, plans: structuredClone(fixture.plans),
  });
  return {
    now, snapshot, state,
    select(next: DesktopScenarioId) {
      const nextFixture = createScenarioFixture(next, realNow());
      fixture = nextFixture; id = next;
      clock = { at: fixture.at, end: fixture.end, startedAt: realNow() };
      revision = randomUUID(); version++;
      conditions = { offline: false, expired: false, slow: false };
    },
    setCondition(key: keyof Conditions, value: boolean) {
      conditions = { ...conditions, [key]: value }; version++;
    },
    session,
    report: (from: string, to: string) => ({ ...fixture.report(from, to, now()),
      notificationSession: session() }),
  };
}

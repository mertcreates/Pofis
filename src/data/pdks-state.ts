import type { Report } from "@/domain/report";
import type { PdksOperation, RequestFailure } from "@/lib/pdks-failure";

export type PdksState = {
  connected: boolean | null;
  busy: "" | Exclude<PdksOperation, "runtime">;
  failure: RequestFailure | null;
  report: Report | null;
  stale: boolean;
};

export const initialPdksState: PdksState = {
  connected: null, busy: "session", failure: null, report: null, stale: false,
};

type Action =
  | { type: "started"; operation: PdksState["busy"] }
  | { type: "session-checked"; connected: boolean }
  | { type: "connected" }
  | { type: "returned-to-login" }
  | { type: "report-loaded"; report: Report }
  | { type: "failed"; failure: RequestFailure }
  | { type: "disconnected" };

export function pdksReducer(state: PdksState, action: Action): PdksState {
  switch (action.type) {
    case "returned-to-login":
      return state.connected === false && !state.busy && state.failure?.operation === "connect"
        ? { ...state, failure: null } : state;
    case "started": return { ...state, busy: action.operation, failure: null };
    case "session-checked":
      return action.connected
        ? { ...state, connected: true, busy: "", failure: null }
        : { ...initialPdksState, connected: false, busy: "" };
    case "connected": return { ...state, connected: true, busy: "", failure: null, report: null, stale: false };
    case "report-loaded": return { ...state, busy: "", failure: null, report: action.report, stale: false };
    case "disconnected": return { ...initialPdksState, connected: false, busy: "" };
    case "failed": {
      const { failure } = action;
      if (failure.kind === "session-expired") {
        return { ...initialPdksState, connected: false, busy: "", failure };
      }
      return {
        ...state, busy: "", failure,
        connected: state.connected ?? false,
        stale: state.stale || (failure.operation === "report" && state.report !== null),
      };
    }
  }
}

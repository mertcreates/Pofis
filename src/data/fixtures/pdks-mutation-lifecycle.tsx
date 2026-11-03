import { createRoot } from "react-dom/client";
import { usePdks } from "../use-pdks";

const firstWeek = "2026-10-19", secondWeek = "2026-10-26";
let week = firstWeek;
let connected = false;
let heldMethod = "";
let release: (() => void) | undefined;
let failMethod = "";
let posts = 0, deletes = 0, reports = 0;
let holdReport = false;
let releaseReport: (() => void) | undefined;
let reportName = "";

window.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
  if (String(input).startsWith("/api/report?")) {
    reports++;
    const from = new URL(String(input), "http://fixture").searchParams.get("from")!;
    const to = from === firstWeek ? "2026-10-25" : "2026-11-01";
    const name = reportName || from;
    if (holdReport) await new Promise<void>(resolve => { releaseReport = resolve; });
    return Response.json({ person: { id: "self", name, title: "", unit: "" },
      from, to, fetchedAt: "2026-10-30T10:00:00.000Z", passages: [] });
  }
  if (String(input) !== "/api/session") throw new Error("Unexpected fixture request");
  const method = options?.method || "GET";
  if (method === "POST") posts++;
  if (method === "DELETE") deletes++;
  if (method === heldMethod) await new Promise<void>(resolve => { release = resolve; });
  if (method === failMethod) {
    failMethod = "";
    return method === "POST"
      ? Response.json({ error: "fixture", code: "AUTH_FAILED" }, { status: 401 })
      : Response.json({ error: "fixture", code: "CONNECTION_FAILED" }, { status: 502 });
  }
  if (method === "POST") connected = true;
  if (method === "DELETE") connected = false;
  return Response.json({ connected });
}) as typeof window.fetch;

let state!: ReturnType<typeof usePdks>;
let renderedWeek = "";
function Harness() { renderedWeek = week; state = usePdks(week); return null; }
const root = createRoot(document.getElementById("root")!);
root.render(<Harness />);
const wait = async (condition: () => boolean) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 4000) throw new Error(`Timed out: ${condition}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
const selectWeek = (value: string) => { week = value; root.render(<Harness />); };
const form = document.createElement("form");
form.innerHTML = '<input name="username" value="fixture"><input name="password" value="fixture">';
const password = form.elements.namedItem("password") as HTMLInputElement;

(window as unknown as { runLifecycle(): Promise<object> }).runLifecycle = async () => {
  await wait(() => state?.connected === false && !state.busy);
  heldMethod = "POST";
  const connecting = state.connect(form);
  await wait(() => !!release && state.busy === "connect");
  await state.connect(form);
  check(posts === 1, "A second login started during the first login");
  selectWeek(secondWeek);
  await wait(() => renderedWeek === secondWeek && state.busy === "connect");
  await new Promise(resolve => setTimeout(resolve, 30));
  check(reports === 0, "A report started before login completed");
  heldMethod = ""; release!(); release = undefined;
  await connecting;
  await wait(() => state.report?.from === secondWeek);
  check(state.connected === true && password.value === "", "Week change cancelled login or retained the password");

  heldMethod = "DELETE";
  const disconnecting = state.disconnect();
  await wait(() => !!release && state.busy === "disconnect");
  await state.disconnect();
  check(deletes === 1, "A second logout started during the first logout");
  const reportsBeforeWeekChange = reports;
  selectWeek(firstWeek);
  await wait(() => renderedWeek === firstWeek && state.busy === "disconnect");
  await new Promise(resolve => setTimeout(resolve, 30));
  check(reports === reportsBeforeWeekChange, "A report started before logout completed");
  heldMethod = ""; release!(); release = undefined;
  await disconnecting;
  await wait(() => state.connected === false && state.report === null);

  password.value = "fixture";
  reportName = "delayed initial"; holdReport = true;
  await state.connect(form);
  await wait(() => !!releaseReport && state.busy === "report");
  const finishInitial = releaseReport!;
  const reportsBeforeInitialCheck = reports;
  holdReport = false; reportName = "";
  failMethod = "GET";
  await state.checkSession();
  await wait(() => state.failure?.operation === "session");
  check(reports === reportsBeforeInitialCheck, "Failed session check started a new report");
  await state.retryFailure();
  await wait(() => state.report?.from === firstWeek && !state.busy);
  check(reports === reportsBeforeInitialCheck + 1, "Interrupted first report was not requested exactly once");
  finishInitial();
  await new Promise(resolve => setTimeout(resolve, 30));
  check(state.report?.person.name === firstWeek, "Interrupted first report overwrote its replacement");

  releaseReport = undefined;
  reportName = "delayed refresh"; holdReport = true;
  const refreshing = state.refresh();
  await wait(() => !!releaseReport && state.busy === "report");
  const finishRefresh = releaseReport!;
  const reportsBeforeRefreshCheck = reports;
  holdReport = false; reportName = "";
  await state.checkSession();
  await wait(() => reports === reportsBeforeRefreshCheck + 1 && !state.busy);
  finishRefresh();
  await refreshing;
  await new Promise(resolve => setTimeout(resolve, 30));
  check(state.report?.person.name === firstWeek, "A report from before the session check overwrote the current report");
  reportName = "";
  password.value = "wrong"; failMethod = "POST";
  await state.connect(form);
  await wait(() => state.failure?.code === "AUTH_FAILED");
  check(state.connected === true && state.report?.from === firstWeek && password.value === "",
    "Failed login did not preserve the session/report or clear the password");

  failMethod = "DELETE";
  await state.disconnect();
  await wait(() => state.failure?.operation === "disconnect");
  check(state.connected === true && state.report?.from === firstWeek, "Failed logout discarded the session/report");
  await state.retryFailure();
  await wait(() => state.connected === false && state.report === null);
  root.unmount();
  return { connectWeek: true, disconnectWeek: true, failedConnect: true, failedDisconnect: true,
    mutationLock: true, sessionReportRace: true, sessionFirstReportRace: true };
};

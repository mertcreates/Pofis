const { createServer } = require("node:http");
const mode = process.env.POFIS_DESKTOP_TEST_MODE;
process.on("message", message => { if (message === "shutdown" && mode !== "stubborn") process.exit(0); });
if (mode === "stubborn") process.on("SIGTERM", () => {});
if (mode === "exit") process.exit(23);
if (mode === "hang") setInterval(() => {}, 1000);
else {
  const port = Number(process.argv[2]);
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("X-Pofis-Desktop", mode === "wrong-token" ? "another-process" : process.env.POFIS_DESKTOP_TOKEN);
    response.end(JSON.stringify({ status: "ok", pid: process.pid,
      directory: process.env.POFIS_SESSION_DIR, planDirectory: process.env.POFIS_PLAN_DIR }));
  });
  setTimeout(() => server.listen(port, "127.0.0.1"), 100);
}

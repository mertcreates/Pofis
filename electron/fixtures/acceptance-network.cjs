const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { app, session } = require("electron");
const { isolateAcceptanceAnalytics } = require("../acceptance-network.cjs");

app.setPath("userData", app.commandLine.getSwitchValue("user-data-dir"));
app.whenReady().then(async () => {
  const isolated = session.fromPartition("acceptance-network");
  isolateAcceptanceAnalytics(isolated, true);
  const server = createServer((_request, response) => response.end("fixture"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    for (const url of [
      "https://www.googletagmanager.com/gtag/js?id=fixture",
      "https://www.google-analytics.com/g/collect",
      "https://region1.google-analytics.com/g/collect",
      "https://google-analytics.com/g/collect",
      "https://analytics.google.com/g/collect",
    ]) {
      await assert.rejects(isolated.fetch(url), /ERR_BLOCKED_BY_CLIENT/);
    }
    const response = await isolated.fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal(await response.text(), "fixture");
    console.log("PASS: analytics blocked; loopback available");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });

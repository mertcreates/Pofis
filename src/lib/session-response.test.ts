import { expect, test } from "bun:test";
import { api } from "./api-client.js";
import { readSessionResponse } from "./session-response.js";

test.each([
  ["GET", false], ["GET", true], ["POST", true], ["DELETE", false],
] as const)("%s oturum yanıtı %s durumunu doğrular", async (method, connected) => {
  const value = await api("/api/session", { method }, async () => Response.json({ connected }));
  expect(readSessionResponse(value, "/api/session", method)).toBe(connected);
});

test.each([
  ["GET", {}], ["GET", { connected: "false" }], ["GET", []],
  ["POST", { connected: false }], ["DELETE", { connected: true }], ["DELETE", {}],
] as const)("%s işleminde yanlış başarılı yanıt reddedilir: %j", (method, value) => {
  try {
    readSessionResponse(value, "/api/session", method);
    throw new Error("Expected invalid session response");
  } catch (error) {
    expect(error).toMatchObject({ code: "INVALID_RESPONSE", details: { apiPath: "/api/session", apiMethod: method } });
  }
});

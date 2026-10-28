import { expect, test } from "bun:test";
import { GET } from "../app/api/health/route";
import { GET as appInfo } from "../app/api/app/route";
import { version } from "../../package.json";

test("sağlık yanıtı masaüstü kimliğini yalnız ilgili süreçte taşır", async () => {
  const original = process.env.POFIS_DESKTOP_TOKEN;
  try {
    delete process.env.POFIS_DESKTOP_TOKEN;
    expect(GET().headers.has("X-Pofis-Desktop")).toBe(false);
    process.env.POFIS_DESKTOP_TOKEN = "isolated-fixture-token";
    const response = GET();
    expect(response.headers.get("X-Pofis-Desktop")).toBe("isolated-fixture-token");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", version, dataSource: "pdks" });
  } finally {
    if (original === undefined) delete process.env.POFIS_DESKTOP_TOKEN;
    else process.env.POFIS_DESKTOP_TOKEN = original;
  }
});

test("uygulama bilgisi paket sürümünü bildirir", async () => {
  expect(await appInfo().json()).toEqual({ app: "pofis", version });
});

import { expect, test } from "bun:test";
import { GET } from "./route";
import { changelog } from "@/data/changelog";

test("public katalog aynı veya yeni sürümse kullanılır; eski, bozuk veya erişilemeyen katalogda paket korunur", async () => {
  const previousFetch = globalThis.fetch;
  const previousWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args) => { warnings.push(args); };
  try {
    const sameVersion = [{ ...changelog[0], features: ["Düzeltilmiş yayın metni"] }];
    const newer = [{ version: "999.0.0", publishedOn: "2026-10-23", features: ["Yeni sürüm"] }, ...changelog];
    for (const [remote, expected] of [[sameVersion, sameVersion], [newer, newer],
      [changelog.slice(1), changelog], [[{ ...changelog[0], publishedOn: "2026-02-31" }], changelog]]) {
      globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
        expect(options?.credentials).toBe("omit");
        expect(options?.redirect).toBe("error");
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        return Response.json(remote);
      }) as unknown as typeof fetch;
      const response = await GET();
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).releases).toEqual(expected);
    }
    for (const failure of [new Response("unavailable", { status: 503 }), new Error("offline")]) {
      globalThis.fetch = (async () => {
        if (failure instanceof Error) throw failure;
        return failure;
      }) as unknown as typeof fetch;
      expect((await (await GET()).json()).releases).toEqual(changelog);
    }
    expect(warnings).toHaveLength(3);
  } finally {
    globalThis.fetch = previousFetch;
    console.warn = previousWarn;
  }
});

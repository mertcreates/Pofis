const { test, expect } = require("bun:test");
const { createHash } = require("node:crypto");
const { assertVersion } = require("./ci-build.cjs");
const { assertManifest, assertPublicChanges, assertNoDowngrade, verifyDownload, targetFor,
  readAsset, recover, releaseBody, assertRelease, cleanupDraft } = require("./publish.cjs");

test("yayın sürümü kaynak sürümüyle tam eşleşir", () => {
  expect(() => assertVersion("1.2.3", "1.2.3")).not.toThrow();
  for (const version of ["01.2.3", "v1.2.3", "1.2.3-beta", "1.2.4", "1.2.3\n"]) {
    expect(() => assertVersion(version, "1.2.3")).toThrow();
  }
});

test("üç hedef yalnız kendi public release ZIP adresini kabul eder", () => {
  for (const id of ["win32-x64", "darwin-arm64", "darwin-x64"]) {
    const { platform, arch } = targetFor(id);
    const manifest = { schemaVersion: 1, platform, arch, version: "1.2.3", size: 50,
      sha256: "a".repeat(64),
      url: `https://github.com/mertcreates/pofis-landing/releases/download/v1.2.3/Pofis-1.2.3-${id}.zip` };
    expect(() => assertManifest(manifest, "1.2.3", id)).not.toThrow();
    for (const invalid of [{ url: "https://example.com/package.zip" }, { size: 0 }, { size: 2 ** 31 },
      { version: "1.2.4" }, { arch: "ia32" }, { sha256: "bad" }]) {
      expect(() => assertManifest({ ...manifest, ...invalid }, "1.2.3", id)).toThrow();
    }
  }
  expect(() => targetFor("linux-x64")).toThrow();
});

test("public commit yalnız installer ve üç manifesti içerebilir", () => {
  expect(() => assertPublicChanges(["public/install.ps1", "public/install.sh", "public/releases/windows/latest.json",
    "public/releases/macos/arm64/latest.json", "public/releases/macos/x64/latest.json"])).not.toThrow();
  for (const path of ["src/app/page.tsx", ".env", "public/source.zip", "package.json", "../Pofis/secret"]) {
    expect(() => assertPublicChanges([path])).toThrow();
  }
});

test("sürüm karşılaştırması sayısaldır ve düşürmeyi reddeder", () => {
  expect(() => assertNoDowngrade("1.9.0", "1.10.0")).not.toThrow();
  expect(() => assertNoDowngrade("1.10.0", "1.10.0")).not.toThrow();
  expect(() => assertNoDowngrade("1.10.0", "1.9.9")).toThrow();
  expect(() => assertNoDowngrade("2.0.0", "1.99.99")).toThrow();
});

test("akışlı indirme eksik, fazla ve aynı boyutta bozuk veriyi reddeder", async () => {
  const bytes = Buffer.from("gerçek indirme bütünlüğü");
  const manifest = { size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  const saved = [];
  await verifyDownload(new Response(bytes), manifest, chunk => saved.push(Buffer.from(chunk)));
  expect(Buffer.concat(saved)).toEqual(bytes);
  await expect(verifyDownload(new Response(bytes.subarray(1)), manifest)).rejects.toThrow();
  await expect(verifyDownload(new Response(Buffer.concat([bytes, bytes])), manifest)).rejects.toThrow();
  await expect(verifyDownload(new Response(Buffer.alloc(bytes.length)), manifest)).rejects.toThrow();
  await expect(verifyDownload(new Response("", { status: 404 }), manifest)).rejects.toThrow();
});

test("asset içeriğini octet-stream ile alır; API metadatasını manifest sanmaz", async () => {
  const previousFetch = globalThis.fetch;
  const token = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "isolated-test-token";
  const manifest = { version: "1.2.3" };
  try {
    globalThis.fetch = async (url, options) => {
      expect(url).toBe("https://api.github.com/repos/mertcreates/pofis-landing/releases/assets/42");
      expect(options.headers.Accept).toBe("application/octet-stream");
      return Response.json(manifest);
    };
    const release = { assets: [{ name: "manifest.json", id: 42, state: "uploaded" }] };
    expect(await readAsset(release, "manifest.json")).toEqual(manifest);
    expect(await readAsset(release, "manifest.json", true)).toBeInstanceOf(Response);
    await expect(readAsset(release, "missing.json")).rejects.toThrow();
  } finally {
    globalThis.fetch = previousFetch;
    if (token === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = token;
  }
});

test("son birleştirme ve yayımlanmış release eksikse asset silmez", async () => {
  const previousFetch = globalThis.fetch;
  let called = false;
  try {
    globalThis.fetch = async () => { called = true; throw new Error("Ağ çağrısı beklenmiyordu"); };
    const assets = [{ name: "Pofis-1.2.3-darwin-arm64.zip", id: 42, state: "uploaded" }];
    await expect(recover("1.2.3", "darwin-arm64", { draft: true, assets }, false)).rejects.toThrow("eksik");
    await expect(recover("1.2.3", "darwin-arm64", { draft: false, assets })).rejects.toThrow("eksik");
    expect(called).toBe(false);
  } finally { globalThis.fetch = previousFetch; }
});

test("aynı sürüm farklı kaynak commit'iyle devam ettirilemez", () => {
  const previous = process.env.GITHUB_SHA;
  try {
    process.env.GITHUB_SHA = "a".repeat(40);
    const release = { body: releaseBody("1.2.3") };
    expect(() => assertRelease(release, "1.2.3")).not.toThrow();
    process.env.GITHUB_SHA = "b".repeat(40);
    expect(() => assertRelease(release, "1.2.3")).toThrow();
  } finally {
    if (previous === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = previous;
  }
});

test("eksik draft temizliği yalnız ilgili platformun asset'ini siler", async () => {
  const previousFetch = globalThis.fetch;
  const token = process.env.GH_TOKEN;
  const output = process.env.GITHUB_OUTPUT;
  process.env.GH_TOKEN = "isolated-test-token";
  delete process.env.GITHUB_OUTPUT;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push([url, options.method]);
      return new Response(null, { status: 204 });
    };
    expect(await recover("1.2.3", "darwin-arm64", { draft: true, assets: [
      { name: "Pofis-1.2.3-darwin-arm64.zip", id: 42, state: "uploaded" },
      { name: "Pofis-1.2.3-darwin-x64.zip", id: 43, state: "uploaded" },
      { name: "manual-notes.txt", id: 44, state: "uploaded" },
    ] })).toBe(false);
    expect(calls).toEqual([["https://api.github.com/repos/mertcreates/pofis-landing/releases/assets/42", "DELETE"]]);
  } finally {
    globalThis.fetch = previousFetch;
    if (token === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = token;
    if (output === undefined) delete process.env.GITHUB_OUTPUT; else process.env.GITHUB_OUTPUT = output;
  }
});

test("başarısız build yalnız aynı kaynak commit'in draft release'ini siler", async () => {
  const previousFetch = globalThis.fetch;
  const token = process.env.GH_TOKEN;
  const sha = process.env.GITHUB_SHA;
  process.env.GH_TOKEN = "isolated-test-token";
  process.env.GITHUB_SHA = "a".repeat(40);
  const calls = [];
  let releases = [];
  let deleteStatus = 204;
  try {
    globalThis.fetch = async (url, options) => {
      calls.push([url, options.method]);
      return options.method === "DELETE"
        ? new Response(null, { status: deleteStatus }) : Response.json(releases);
    };
    const list = ["https://api.github.com/repos/mertcreates/pofis-landing/releases?per_page=100&page=1", "GET"];
    const deletion = ["https://api.github.com/repos/mertcreates/pofis-landing/releases/42", "DELETE"];
    await cleanupDraft("1.2.3");
    expect(calls.splice(0)).toEqual([list]);

    const draft = { id: 42, tag_name: "v1.2.3", draft: true, body: releaseBody("1.2.3") };
    releases = [{ ...draft, draft: false }];
    await cleanupDraft("1.2.3");
    expect(calls.splice(0)).toEqual([list]);

    releases = [{ ...draft, body: draft.body.replace("a".repeat(40), "b".repeat(40)) }];
    await expect(cleanupDraft("1.2.3")).rejects.toThrow("kaynak commit");
    expect(calls.splice(0)).toEqual([list]);

    releases = [{ ...draft, tag_name: "v1.2.4" }];
    await cleanupDraft("1.2.3");
    expect(calls.splice(0)).toEqual([list]);

    releases = [draft];
    await cleanupDraft("1.2.3");
    expect(calls.splice(0)).toEqual([list, deletion]);

    deleteStatus = 403;
    await expect(cleanupDraft("1.2.3")).rejects.toThrow("HTTP 403");
    expect(calls.splice(0)).toEqual([list, deletion]);
  } finally {
    globalThis.fetch = previousFetch;
    if (token === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = token;
    if (sha === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = sha;
  }
});

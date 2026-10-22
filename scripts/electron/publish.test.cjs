const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createHash } = require("node:crypto");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { assertVersion } = require("./ci-build.cjs");
const { assertManifest, assertPublicChanges, assertNoDowngrade, verifyDownload, targetFor,
  readAsset, recover, releaseBody, assertRelease, cleanupDraft, verifyLiveOnce, beginRelease } = require("./publish.cjs");

test("yayın sürümü kaynak sürümüyle tam eşleşir", () => {
  expect(() => assertVersion("1.2.3", "1.2.3")).not.toThrow();
  for (const version of ["01.2.3", "v1.2.3", "1.2.3-beta", "1.2.4", "1.2.3\n"]) {
    expect(() => assertVersion(version, "1.2.3")).toThrow();
  }
});

test("dört hedef yalnız kendi public release paket adresini kabul eder", () => {
  for (const id of ["win32-x64", "darwin-arm64", "darwin-x64", "linux-x64"]) {
    const { platform, arch, archiveExtension } = targetFor(id);
    const manifest = { schemaVersion: 1, platform, arch, version: "1.2.3", size: 50,
      sha256: "a".repeat(64),
      url: `https://github.com/mertcreates/pofis-landing/releases/download/v1.2.3/Pofis-1.2.3-${id}.${archiveExtension}` };
    expect(() => assertManifest(manifest, "1.2.3", id)).not.toThrow();
    for (const invalid of [{ url: "https://example.com/package.zip" }, { size: 0 }, { size: 2 ** 31 },
      { version: "1.2.4" }, { arch: "ia32" }, { sha256: "bad" }]) {
      expect(() => assertManifest({ ...manifest, ...invalid }, "1.2.3", id)).toThrow();
    }
  }
  expect(() => targetFor("linux-arm64")).toThrow();
});

test("public commit yalnız installer ve platform manifestlerini içerebilir", () => {
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
    const release = { tag_name: "v1.2.3", body: releaseBody("1.2.3") };
    expect(() => assertRelease(release, "1.2.3")).not.toThrow();
    release.body = release.body.replace("Bu sürüm için ayrıca bir değişiklik notu eklenmedi.", "Elle düzeltilmiş sürüm notları.");
    expect(() => assertRelease(release, "1.2.3")).not.toThrow();
    expect(() => assertRelease({ ...release, tag_name: "v1.2.4" }, "1.2.3")).toThrow("kaynak commit");
    expect(() => assertRelease({ ...release, body: "metadata yok" }, "1.2.3")).toThrow("kaynak commit");
    process.env.GITHUB_SHA = "b".repeat(40);
    expect(() => assertRelease(release, "1.2.3")).toThrow();
  } finally {
    if (previous === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = previous;
  }
});

test("yeni taslak en son yayımlanan kararlı sürümü baz alır; tekrar çalıştırmada notlar korunur", async () => {
  const previousFetch = globalThis.fetch;
  const token = process.env.GH_TOKEN;
  const sha = process.env.GITHUB_SHA;
  const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: join(__dirname, "../.."), windowsHide: true });
  process.env.GH_TOKEN = "isolated-test-token";
  process.env.GITHUB_SHA = stdout.trim();
  const valid = { tag_name: "v1.0.0", draft: false, prerelease: false,
    published_at: "2026-10-20T00:00:00Z", body: releaseBody("1.0.0") };
  let releases = [
    ...Array.from({ length: 100 }, () => ({ ...valid, published_at: "2026-10-19T00:00:00Z", body: "older release without source" })),
    { ...valid, draft: true, published_at: "2026-10-21T00:00:00Z", body: "draft is not a base" },
    { ...valid, prerelease: true, published_at: "2026-10-21T00:00:00Z", body: "preview is not a base" }, valid,
  ];
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push([url, options.method]);
      if (options.method === "POST") {
        const draft = JSON.parse(options.body);
        expect(draft.tag_name).toBe("v1.2.3");
        expect(draft.draft).toBe(true);
        expect(draft.body).toContain("Bu sürüm için ayrıca bir değişiklik notu eklenmedi.");
        expect(draft.body).toContain(`Kaynak commit: ${process.env.GITHUB_SHA}`);
        releases = [{ ...draft, body: draft.body.replace("Bu sürüm için ayrıca bir değişiklik notu eklenmedi.", "İncelenmiş notlar.") }];
        return Response.json(draft);
      }
      const page = Number(new URL(url).searchParams.get("page"));
      return Response.json(releases.slice((page - 1) * 100, page * 100));
    };
    await beginRelease("1.2.3");
    await beginRelease("1.2.3");
    expect(calls.some(([url]) => url.endsWith("page=2"))).toBe(true);
    expect(releases[0].body).toContain("İncelenmiş notlar.");
    expect(calls.filter(([, method]) => method === "POST")).toHaveLength(1);
    process.env.GITHUB_SHA = "f".repeat(40);
    await expect(beginRelease("1.2.3")).rejects.toThrow("kaynak commit");
    expect(calls.filter(([, method]) => method !== "GET")).toHaveLength(1);
  } finally {
    globalThis.fetch = previousFetch;
    if (token === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = token;
    if (sha === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = sha;
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

test("HTTPS kontrolü CRLF/LF farkını kabul eder; değişen içerik ve eksik başlıkları reddeder", async () => {
  const site = await mkdtemp(join(tmpdir(), "pofis-live-"));
  const previousFetch = globalThis.fetch;
  const manifests = new Map();
  let installer = "Write-Output 'Pofis'\n";
  let cache = "no-store";
  try {
    for (const id of ["win32-x64", "darwin-arm64", "darwin-x64", "linux-x64"]) {
      const target = targetFor(id);
      const path = `releases/${target.releaseDirectory.replaceAll("\\", "/")}/latest.json`;
      const manifest = { schemaVersion: 1, platform: target.platform, arch: target.arch, version: "1.2.3",
        size: 50, sha256: "a".repeat(64),
        url: `https://github.com/mertcreates/pofis-landing/releases/download/v1.2.3/Pofis-1.2.3-${id}.${target.archiveExtension}` };
      manifests.set(path, manifest);
      await mkdir(join(site, "public", "releases", target.releaseDirectory), { recursive: true });
      await writeFile(join(site, "public", path), JSON.stringify(manifest));
    }
    await writeFile(join(site, "public/install.ps1"), "Write-Output 'Pofis'\r\n");
    await writeFile(join(site, "public/install.sh"), "#!/bin/bash\necho Pofis\n");
    globalThis.fetch = async url => {
      const path = new URL(url).pathname.slice(1);
      if (manifests.has(path)) return Response.json(manifests.get(path), { headers: { "Cache-Control": "no-store" } });
      if (path === "") return new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
      if (path === "install.ps1" || path === "install.sh") return new Response(
        path === "install.ps1" ? installer : "#!/bin/bash\necho Pofis\n",
        { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cache } });
      throw new Error(`Beklenmeyen adres: ${url}`);
    };
    await verifyLiveOnce(site, "1.2.3");
    installer = "Write-Output 'Başka içerik'\n";
    await expect(verifyLiveOnce(site, "1.2.3")).rejects.toThrow("içeriği farklı: install.ps1");
    installer = "Write-Output 'Pofis'\n";
    cache = "public, max-age=3600";
    await expect(verifyLiveOnce(site, "1.2.3")).rejects.toThrow("HTTP başlıkları hazır değil: install.ps1");
  } finally {
    globalThis.fetch = previousFetch;
    await rm(site, { recursive: true, force: true });
  }
});

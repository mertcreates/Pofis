const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { publicNotes, readReleaseNotes, sourceCommit } = require("./release-notes.cjs");
const execute = promisify(execFile);

test("mevcut conventional ve serbest başlıklar kullanıcı değişikliklerini gruplar; teknik gövdeler aktarılmaz", () => {
  const commits = [
    "feat(pofi): add meal photo to album with character caption\n\nprivate endpoint and credentials",
    "Add opt-in desktop and Telegram work reminders", "macos 12 support",
    "fix: keep live duration after unmatched exit", "Fix weekly plan totals and conservative duration display",
    "refine Pofi note continuity and meal commentary", "Update Pofi tagline punctuation",
    "feat: Show desktop updates inside the app", "feat: show desktop updates inside the app",
    "chore: bump version to 0.6.0", "Bump package version to 0.5.0", "Merge branch 'private-work'",
    "Reduce Windows CI contention and write portable UTF-8 ZIP filenames",
    "Harden macOS CI process cleanup against escaped and reparented children",
    "Speed up Windows packaging and archive the standalone server",
    "feat: Prepare desktop releases for independent landing deployment",
    "fix: validate versioned sharp binary in Intel macOS packages",
    "docs: document static runtime verification and metadataFile contract",
    "Remove GA4 analytics smoke", "Unknown private work",
  ];
  expect(publicNotes(commits.join("\0"), false)).toBe([
    "## Yenilikler", "", "- Add meal photo to album with character caption",
    "- Add opt-in desktop and Telegram work reminders", "- macOS 12 support",
    "- Show desktop updates inside the app", "", "## Düzeltmeler", "",
    "- Keep live duration after unmatched exit", "- Fix weekly plan totals and conservative duration display",
    "", "## Performans ve bakım", "", "- Refine Pofi note continuity and meal commentary",
    "- Update Pofi tagline punctuation",
  ].join("\n"));
});

test("açık not başlığı geçersiz kılar; skip dışlar; düz metin korunur ve hatalı not durdurur", () => {
  const log = [
    "Internal detail\n\nRelease-note: fix: Türkçe düzeltme & <tag> [bağlantı](url)",
    "feat: internal feature\n\nRelease-note: skip",
    "Fix another detail\n\nRelease-note: chore: Daha hızlı açılış\nRelease-note: feat: Yeni seçenek",
    'Revert "feat: Old feature"',
  ].join("\0");
  const notes = publicNotes(log, false);
  expect(notes).toContain("## Düzeltmeler\n\n- Türkçe düzeltme &amp; &lt;tag&gt; \\[bağlantı\\]\\(url\\)");
  expect(notes).toContain("- Revert: Old feature");
  expect(notes).toContain("## Yenilikler\n\n- Yeni seçenek");
  expect(notes).toContain("## Performans ve bakım\n\n- Daha hızlı açılış");
  expect(notes).not.toMatch(/Internal|internal|another detail/);
  expect(() => publicNotes("feat: item\n\nRelease-note: typo: wrong", false)).toThrow("Sürüm notu biçimi");
  expect(publicNotes("docs: internal", false)).toBe("Bu sürüm için ayrıca bir değişiklik notu eklenmedi.");
  expect(publicNotes("", true)).toBe("Pofis’in ilk masaüstü sürümü.");
  expect(publicNotes("feat(api)!: Change public contract", false)).toContain("- Uyumluluk değişikliği: Change public contract");
});

test("gerçek Git aralığı önceki sürümü ve sonraki commit'i dışlar; eksik veya ayrışmış geçmiş reddedilir", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "pofis-release-notes-"));
  const git = async (...args) => (await execute("git", args, { cwd, windowsHide: true })).stdout.trim();
  const commit = async message => { await git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "commit", "--allow-empty", "-m", message); return git("rev-parse", "HEAD"); };
  try {
    await git("init");
    const base = await commit("feat: Old feature");
    await commit("feat: Current feature\n\nPrivate body");
    const current = await commit("Fix current issue");
    await commit("feat: Future feature");
    const previous = { body: `Old release prose\n\nPofis ortak sürüm otomasyonu.\nKaynak commit: ${base}` };
    expect(sourceCommit(previous)).toBe(base);
    const notes = await readReleaseNotes(previous, current, cwd);
    expect(notes).toContain("- Current feature");
    expect(notes).toContain("- Fix current issue");
    expect(notes).not.toMatch(/Old feature|Future feature|Private body/);
    expect(await readReleaseNotes(null, base, cwd)).toContain("- Old feature");
    await expect(readReleaseNotes({ body: "no source" }, current, cwd)).rejects.toThrow("kaynak commit");
    await expect(readReleaseNotes(previous, "f".repeat(40), cwd)).rejects.toThrow("geçmişi okunamadı");
    await git("checkout", "--orphan", "unrelated");
    const unrelated = await commit("feat: Other history");
    await expect(readReleaseNotes(previous, unrelated, cwd)).rejects.toThrow("atası olmalı");
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

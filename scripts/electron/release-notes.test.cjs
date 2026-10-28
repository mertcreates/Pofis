const { test, expect } = require("bun:test");
const { publicNotes, changelogNotes } = require("./release-notes.cjs");

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

test("katalog notları Türkçe metni ve bölümleri korur, Markdown işaretlerini kaçışlar", () => {
  expect(changelogNotes({
    features: ["Yeni & <güvenli> özellik"],
    fixes: ["[Plan] düzeltildi\nYeni satır"],
    maintenance: ["Açılış hızlandı"],
  })).toBe([
    "## Yenilikler", "", "- Yeni &amp; &lt;güvenli&gt; özellik", "",
    "## Düzeltmeler", "", "- \\[Plan\\] düzeltildi Yeni satır", "",
    "## Performans ve bakım", "", "- Açılış hızlandı",
  ].join("\n"));
  expect(changelogNotes({ fixes: ["Düzeltildi"] })).toBe("## Düzeltmeler\n\n- Düzeltildi");
});

const { test, expect } = require("bun:test");
const { changelogNotes } = require("./release-notes.cjs");

test("katalog notları Türkçe metni ve bölümleri korur, Markdown işaretlerini kaçışlar", () => {
  expect(changelogNotes({
    features: ["Yeni & <güvenli> özellik"],
    fixes: ["[Plan] düzeltildi\nYeni satır"],
    maintenance: ["Açılış hızlandı"],
  })).toBe([
    "## Yenilikler", "", "- Yeni &amp; &lt;güvenli&gt; özellik", "",
    "## Düzeltmeler", "", "- \\[Plan\\] düzeltildi Yeni satır", "",
    "## Bakım", "", "- Açılış hızlandı",
  ].join("\n"));
  expect(changelogNotes({ fixes: ["Düzeltildi"] })).toBe("## Düzeltmeler\n\n- Düzeltildi");
});

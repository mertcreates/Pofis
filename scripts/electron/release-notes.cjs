const RELEASE_MARKER = "Pofis ortak sürüm otomasyonu.";
const shaPattern = /^[a-f0-9]{40}$/;

function escapeNote(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replace(/[\\`*_[\]()!#]/g, "\\$&");
}

function sourceCommit(release) {
  // Keep reading the footer used by existing releases; prose can change independently.
  return release?.body?.match(/(?:^|\n)Pofis ortak sürüm otomasyonu\.\r?\nKaynak commit: ([a-f0-9]{40})\s*$/)?.[1];
}

function changelogNotes(release) {
  return [["features", "Yenilikler"], ["fixes", "Düzeltmeler"], ["maintenance", "Bakım"]]
    .filter(([group]) => release[group]?.length)
    .map(([group, title]) => `## ${title}\n\n${release[group]
      .map(note => `- ${escapeNote(note.trim().replace(/\s*\r?\n\s*/g, " "))}`).join("\n")}`)
    .join("\n\n");
}

function releaseBody(version, notes) {
  if (!shaPattern.test(process.env.GITHUB_SHA || "")) throw new Error("Kaynak commit kimliği geçersiz.");
  if (typeof notes !== "string" || !notes.trim()) throw new Error("Sürüm notları bulunamadı.");
  return `Pofis ${version}\n\n${notes}\n\nKurulum: https://pofis.app\n\nWindows x64 · macOS Apple Silicon/Intel · Ubuntu 24.04 LTS x64\n\n${RELEASE_MARKER}\nKaynak commit: ${process.env.GITHUB_SHA}`;
}

module.exports = { sourceCommit, changelogNotes, releaseBody };

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { resolve } = require("node:path");

const execute = promisify(execFile);
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

function subjectNote(subject) {
  const reverted = subject.match(/^Revert "(.+)"$/);
  if (reverted) {
    const original = subjectNote(reverted[1]);
    return original && ["fix", `Revert: ${original[1]}`];
  }
  const conventional = subject.match(/^(feat|fix|perf|refactor|chore|docs|test|build|ci|style)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i);
  const type = conventional?.[1].toLowerCase();
  const text = (conventional?.[4] || subject).trim();
  if (type && /^(docs|test|build|ci|style|chore)$/.test(type)) return;
  if (/^(ci|test|tests|build|docs)$/i.test(conventional?.[2] || "")) return;
  // These terms describe internal work in this repository's existing commit history.
  if (/\b(CI|CDP|SWC|ICU|sharp|Rosetta|Turbopack|tests?|testing|smoke|acceptance|fixtures?|runners?|standalone|packaging|runtime|metadata|workflow|assertions?|documentation|publishing)\b|\b(?:desktop releases|Electron download|storage|contracts)\b|\b(?:bump|package) version\b/i.test(text)) return;
  let category = type === "refactor" ? "perf" : type;
  if (!category) {
    if (/^(add|support|allow|enable|introduce|prepare|build)\b|\bsupport$/i.test(text)) category = "feat";
    else if (/^(fix|avoid|normalize|preserve|keep|resolve|correct|prevent|harden)\b/i.test(text)) category = "fix";
    else if (/^(improve|refine|refresh|update|replace|remove|reduce|speed up|optimize|streamline|clarify|explain|open)\b/i.test(text)) category = "perf";
  }
  if (category) return [category, conventional?.[3] ? `Uyumluluk değişikliği: ${text}` : text];
}

function publicNotes(log, firstRelease) {
  const groups = { feat: ["Yenilikler", new Map()], fix: ["Düzeltmeler", new Map()],
    perf: ["Performans ve bakım", new Map()] };
  for (const commit of log.split("\0")) {
    const [subject, ...body] = commit.trim().split(/\r?\n/);
    if (!subject || /^Merge\b/.test(subject)) continue;
    const overrides = body.filter(line => line.startsWith("Release-note:"));
    let notes;
    if (overrides.length) {
      if (overrides.length === 1 && overrides[0] === "Release-note: skip") continue;
      notes = overrides.map(line => {
        const note = line.match(/^Release-note: (feat|fix|perf|chore): (\S.*)$/);
        if (!note) throw new Error("Sürüm notu biçimi: Release-note: feat|fix|perf|chore: kullanıcıya yönelik metin; veya Release-note: skip");
        return [note[1] === "chore" ? "perf" : note[1], note[2]];
      });
    } else {
      const note = subjectNote(subject);
      notes = note ? [note] : [];
    }
    for (const [category, raw] of notes) {
      const text = raw.trim().normalize("NFC");
      const formatted = escapeNote((text[0].toUpperCase() + text.slice(1)).replace(/\bmacos\b/gi, "macOS"));
      groups[category][1].set(text.toLowerCase(), formatted);
    }
  }
  const sections = [groups.feat, groups.fix, groups.perf]
    .filter(([, notes]) => notes.size)
    .map(([title, notes]) => `## ${title}\n\n${[...notes.values()].map(text => `- ${text}`).join("\n")}`);
  return sections.join("\n\n") || (firstRelease
    ? "Pofis’in ilk masaüstü sürümü."
    : "Bu sürüm için ayrıca bir değişiklik notu eklenmedi.");
}

function changelogNotes(release) {
  return [["features", "Yenilikler"], ["fixes", "Düzeltmeler"], ["maintenance", "Performans ve bakım"]]
    .filter(([group]) => release[group]?.length)
    .map(([group, title]) => `## ${title}\n\n${release[group]
      .map(note => `- ${escapeNote(note.trim().replace(/\s*\r?\n\s*/g, " "))}`).join("\n")}`)
    .join("\n\n");
}

async function hasCommit(commit, cwd) {
  try {
    await execute("git", ["rev-parse", "--verify", "--quiet", `${commit}^{commit}`], { cwd, windowsHide: true });
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw new Error("Sürüm notları için Git geçmişi okunamadı.", { cause: error });
  }
}

async function readReleaseNotes(previous, current, cwd = resolve(__dirname, "../..")) {
  if (!shaPattern.test(current || "")) throw new Error("Kaynak commit kimliği geçersiz.");
  if (!await hasCommit(current, cwd)) throw new Error("Sürüm notları için mevcut kaynak commit erişilemiyor.");
  const base = previous && sourceCommit(previous);
  if (previous && (!base || !await hasCommit(base, cwd))) return null;
  if (base) {
    try {
      await execute("git", ["merge-base", "--is-ancestor", base, current], { cwd, windowsHide: true });
    } catch (error) {
      if (error.code === 1) return null;
      throw new Error("Sürüm notları için Git geçmişi okunamadı.", { cause: error });
    }
  }
  let stdout;
  try {
    ({ stdout } = await execute("git", ["log", "--reverse", "--format=%B%x00", base ? `${base}..${current}` : current],
      { cwd, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }));
  } catch (error) {
    throw new Error("Sürüm notları için Git geçmişi okunamadı.", { cause: error });
  }
  return publicNotes(stdout, !previous);
}

function releaseBody(version, notes = "Bu sürüm için ayrıca bir değişiklik notu eklenmedi.") {
  if (!shaPattern.test(process.env.GITHUB_SHA || "")) throw new Error("Kaynak commit kimliği geçersiz.");
  return `Pofis ${version}\n\n${notes}\n\nKurulum: https://pofis.app\n\nWindows x64 · macOS Apple Silicon/Intel · Ubuntu 24.04 LTS x64\n\n${RELEASE_MARKER}\nKaynak commit: ${process.env.GITHUB_SHA}`;
}

module.exports = { sourceCommit, publicNotes, changelogNotes, readReleaseNotes, releaseBody };

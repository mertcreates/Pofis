export const CHANGELOG_SEEN_KEY = "pofis:changelog-seen";

export type ChangelogRelease = {
  version: string;
  publishedOn: string;
  features?: readonly string[];
  fixes?: readonly string[];
  maintenance?: readonly string[];
};

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GROUPS = ["features", "fixes", "maintenance"] as const;

function versionParts(version: string) {
  return version.split(".").map(Number);
}

export function compareChangelogVersions(left: string, right: string) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  for (let index = 0; index < 3; index++) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function releaseFrom(value: unknown): ChangelogRelease {
  if (!value || typeof value !== "object") throw new Error("Sürüm geçmişi kaydı geçersiz.");
  const release = value as Record<string, unknown>;
  if (typeof release.version !== "string" || release.version.trim() !== release.version || !VERSION_PATTERN.test(release.version) ||
      !versionParts(release.version).every(Number.isSafeInteger) ||
      typeof release.publishedOn !== "string" || !DATE_PATTERN.test(release.publishedOn) ||
      !Number.isFinite(Date.parse(`${release.publishedOn}T00:00:00Z`)) ||
      new Date(`${release.publishedOn}T00:00:00Z`).toISOString().slice(0, 10) !== release.publishedOn) {
    throw new Error("Sürüm geçmişi kimliği veya tarihi geçersiz.");
  }
  const parsed: ChangelogRelease = { version: release.version, publishedOn: release.publishedOn };
  let itemCount = 0;
  for (const group of GROUPS) {
    const items = release[group];
    if (items === undefined) continue;
    if (!Array.isArray(items) || !items.length || items.some(item => typeof item !== "string" || !item.trim())) {
      throw new Error(`Sürüm geçmişinin ${group} alanı geçersiz.`);
    }
    parsed[group] = items.map(item => item.trim());
    itemCount += items.length;
  }
  if (!itemCount) throw new Error("Sürüm geçmişi kaydı değişiklik içermiyor.");
  return parsed;
}

export function parseChangelog(value: unknown): readonly ChangelogRelease[] {
  if (!Array.isArray(value) || !value.length) throw new Error("Sürüm geçmişi bulunamadı.");
  const releases = value.map(releaseFrom);
  const versions = new Set<string>();
  for (let index = 0; index < releases.length; index++) {
    const release = releases[index];
    if (versions.has(release.version)) throw new Error("Sürüm geçmişinde yinelenen sürüm var.");
    versions.add(release.version);
    if (index > 0 && compareChangelogVersions(releases[index - 1].version, release.version) <= 0) {
      throw new Error("Sürüm geçmişi yeniden eskiye sıralanmalı.");
    }
  }
  return releases;
}

function versionParts(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const parts = version.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

function validReleaseManifest(manifest, target) {
  return !!manifest && typeof manifest === "object" && !Array.isArray(manifest) &&
    manifest.schemaVersion === 1 && manifest.platform === target.platform && manifest.arch === target.arch &&
    versionParts(manifest.version) !== null && Number.isSafeInteger(manifest.size) &&
    manifest.size > 0 && manifest.size < 2 ** 31 && typeof manifest.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(manifest.sha256);
}

function archiveName(target, version) {
  return `Pofis-${version}-${target.id}.${target.archiveExtension}`;
}

module.exports = { versionParts, validReleaseManifest, archiveName };

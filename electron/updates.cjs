const { ui } = require("./ui-text.cjs");
const { versionParts, validReleaseManifest, archiveName } = require("./release-manifest.cjs");

async function checkForUpdates({ target, currentVersion, isActive,
  fetchManifest = globalThis.fetch, timeoutMs = 5000 }) {
  if (!isActive()) return;
  const directory = target.releaseDirectory.replaceAll("\\", "/");
  const response = await fetchManifest(`https://pofis.app/releases/${directory}/latest.json`, {
    signal: AbortSignal.timeout(timeoutMs), cache: "no-store", credentials: "omit", redirect: "error",
  });
  if (!response.ok) throw new Error(ui.desktop.versionUnavailable);
  const manifest = await response.json();
  const current = versionParts(currentVersion);
  const next = versionParts(manifest?.version);
  if (!current || !next) throw new Error(ui.desktop.invalidVersion);
  if (!validReleaseManifest(manifest, target) ||
      manifest.url !== `https://github.com/mertcreates/pofis-landing/releases/download/v${manifest.version}/${archiveName(target, manifest.version)}`) {
    throw new Error(ui.desktop.invalidVersionInfo);
  }
  const difference = next.findIndex((part, index) => part !== current[index]);
  if (difference === -1 || next[difference] < current[difference] || !isActive()) return;
  return { currentVersion, version: manifest.version, platform: target.platform };
}

module.exports = { checkForUpdates };

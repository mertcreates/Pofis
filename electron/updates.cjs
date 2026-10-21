function versionParts(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error("Geçersiz uygulama sürümü.");
  }
  const parts = version.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error("Geçersiz uygulama sürümü.");
  return parts;
}

async function checkForUpdates({ target, currentVersion, isActive,
  fetchManifest = globalThis.fetch, timeoutMs = 5000 }) {
  if (!isActive()) return;
  const directory = target.releaseDirectory.replaceAll("\\", "/");
  const response = await fetchManifest(`https://pofis.app/releases/${directory}/latest.json`, {
    signal: AbortSignal.timeout(timeoutMs), cache: "no-store", credentials: "omit", redirect: "error",
  });
  if (!response.ok) throw new Error("Sürüm bilgisi alınamadı.");
  const manifest = await response.json();
  const current = versionParts(currentVersion);
  const next = versionParts(manifest?.version);
  if (manifest.schemaVersion !== 1 || manifest.platform !== target.platform || manifest.arch !== target.arch ||
      !Number.isSafeInteger(manifest.size) || manifest.size <= 0 || manifest.size >= 2 ** 31 ||
      typeof manifest.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
      manifest.url !== `https://github.com/mertcreates/pofis-landing/releases/download/v${manifest.version}/Pofis-${manifest.version}-${target.id}.zip`) {
    throw new Error("Geçersiz sürüm bilgisi.");
  }
  const difference = next.findIndex((part, index) => part !== current[index]);
  if (difference === -1 || next[difference] < current[difference] || !isActive()) return;
  return { currentVersion, version: manifest.version, platform: target.platform };
}

module.exports = { checkForUpdates };

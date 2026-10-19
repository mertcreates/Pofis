function versionParts(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error("Geçersiz uygulama sürümü.");
  }
  const parts = version.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error("Geçersiz uygulama sürümü.");
  return parts;
}

async function checkForUpdates({ target, currentVersion, isActive, showMessageBox, writeClipboard,
  fetchManifest = globalThis.fetch }) {
  if (!isActive()) return;
  const directory = target.releaseDirectory.replaceAll("\\", "/");
  const response = await fetchManifest(`https://pofis.app/releases/${directory}/latest.json`, {
    signal: AbortSignal.timeout(5000), cache: "no-store", credentials: "omit", redirect: "error",
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
  const { response: choice } = await showMessageBox({
    type: "info", title: "Pofis", message: "Pofis'in yeni sürümü hazır",
    detail: `Sende ${currentVersion} kurulu. ${manifest.version} sürümüne geçebilirsin.\n\nGüncellemek için kurulum komutunu yeniden çalıştırman yeterli.`,
    buttons: ["Kurulum komutunu kopyala", "Daha sonra"], defaultId: 1, cancelId: 1, noLink: true,
  });
  if (choice === 0 && isActive()) {
    writeClipboard(target.platform === "win32" ? "irm https://pofis.app/install.ps1 | iex"
      : "curl -fsSL https://pofis.app/install.sh | bash");
  }
}

module.exports = { checkForUpdates };

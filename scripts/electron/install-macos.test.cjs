const { test, expect } = require("bun:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const execute = promisify(execFile);
const { MAC_INSTALL_COMMAND } = require("./install-command.cjs");
const bash = process.platform === "darwin" ? "/bin/bash" : process.env.POFIS_TEST_BASH;
const shellTest = bash ? test : test.skip;
const installer = resolve(__dirname, "install.sh");
// Windows has the bundled Git shell; native macOS tests use /bin/bash unchanged.
const localCommand = script => process.platform === "win32"
  ? script.replaceAll("/bin/bash", "'" + bash.replaceAll("\\", "/") + "'") : script;
const command = (code, args = []) => execute(bash, ["-c", 'source "$1"; ' + code, "pofis-test", installer, ...args]);

const closeFixture = `
running=42; prompts=0; closes=0; kills=0
running_pids() { printf '%s' "$running"; }
wait_closed() { [[ -z "$running" ]]; }
request_close() { closes=$((closes + 1)); running=''; }
force_close() { kills=$((kills + 1)); running=''; }
`;

shellTest("macOS yanıtsız kurulum açık uygulamayı kapatmaz", async () => {
  const failure = await command(closeFixture + 'close_for_update').then(() => null, error => error);
  expect(failure?.code).toBe(1);
  expect(failure?.stderr).toContain("Onay alınamadı");
});

shellTest("macOS iptalde kapanış isteği veya kill göndermez", async () => {
  await command(closeFixture + `
confirm_close() { prompts=$((prompts + 1)); return 1; }
! close_for_update
[[ "$running" == 42 && "$prompts" == 1 && "$closes" == 0 && "$kills" == 0 ]]
`);
});

shellTest("macOS normal kapanış bir onayla tamamlanır; kapalı uygulamada soru sorulmaz", async () => {
  await command(closeFixture + `
confirm_close() { prompts=$((prompts + 1)); return 0; }
close_for_update
[[ -z "$running" && "$prompts" == 1 && "$closes" == 1 && "$kills" == 0 ]]
confirm_close() { return 1; }
close_for_update
`);
});

shellTest("macOS zorla kapatma reddi mevcut süreci korur", async () => {
  await command(closeFixture + `
request_close() { closes=$((closes + 1)); return 1; }
confirm_close() { prompts=$((prompts + 1)); [[ "$prompts" == 1 ]]; }
! close_for_update
[[ "$running" == 42 && "$prompts" == 2 && "$closes" == 1 && "$kills" == 0 ]]
`);
});

shellTest("macOS zorla kapatma ikinci onaydan sonra çalışır; bitmeyen süreç başarı sayılmaz", async () => {
  await command(closeFixture + `
request_close() { closes=$((closes + 1)); }
confirm_close() { prompts=$((prompts + 1)); return 0; }
close_for_update
[[ -z "$running" && "$prompts" == 2 && "$kills" == 1 ]]
running=42
force_close() { kills=$((kills + 1)); }
! close_for_update
[[ "$running" == 42 && "$kills" == 2 ]]
`);
});

shellTest("macOS süreç listesi okunamazsa güncelleme devam etmez", async () => {
  await command('running_pids() { return 1; }; confirm_close() { exit 99; }; ! close_for_update');
});

shellTest("macOS installer gerçek Bash ile geçerli ve geçersiz sürümleri ayırır", async () => {
  await command('valid_version 1.2.3; valid_version 1.10.0; older 1.9.9 1.10.0; ! older 1.10.0 1.9.9; ! older 1.0.0 1.0.0');
  for (const version of ["01.2.3", "1.2", "1.2.3-beta", "-1.2.3", "9999999.0.0"]) {
    await expect(command('valid_version "$2"', [version])).rejects.toThrow();
  }
  // Construct the newline inside Bash; MSYS strips trailing newlines in Windows argv.
  await expect(command("v=$'1.2.3\\n'; valid_version \"$v\"")).rejects.toThrow();
});

shellTest("macOS installer dışarı çıkan veya başka köklü arşiv yollarını reddeder", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-archive-paths-"));
  try {
    const list = join(directory, "entries.txt");
    await writeFile(list, "Pofis.app/Contents/MacOS/Pofis\n__MACOSX/Pofis.app/._Contents\n");
    await command('assert_archive_paths "$2"', [list]);
    for (const path of ["../escape", "/Pofis.app/Contents/a", "Pofis.app/../escape", "Pofis.app/./a", "other.app/a", "Pofis.app/a\\b"]) {
      await writeFile(list, path + "\n");
      await expect(command('assert_archive_paths "$2"', [list])).rejects.toThrow();
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

shellTest("macOS installer ağ isteğinden önce güvensiz adresleri reddeder", async () => {
  for (const url of ["http://example.com/package.zip", "file:///tmp/package.zip", "ftp://example.com/package.zip"]) {
    await expect(command('download "$2" /dev/null', [url])).rejects.toThrow("HTTPS");
  }
});

shellTest("kısa kurulum komutu installer argümanlarını ve hata kodunu korur", async () => {
  const host = Bun.serve({ hostname: "127.0.0.1", port: 0,
    fetch: () => new Response('printf "%s" "$1"; exit 23\n') });
  try {
    const script = MAC_INSTALL_COMMAND.replace("https://pofis.app/install.sh", `http://127.0.0.1:${host.port}/install.sh`) + ' -s -- "iki kelime"';
    const failure = await execute(bash, ["-c", localCommand(script)]).then(() => null, error => error);
    expect(failure?.code).toBe(23);
    expect(failure?.stdout).toBe("iki kelime");
    expect(failure?.stderr).not.toContain("indirilemedi");
  } finally { host.stop(true); }
});

shellTest("açılış hatası gerçek mesajı taşır; yabancı istek sonucunu kabul etmez", async () => {
  const fields = 'json() { case "$2" in schemaVersion) echo 1;; requestId) echo request;; version) echo 1.2.3;; status) echo error;; message) echo "Pofis sunucusu kapandı (kod: 23).";; esac; }; ';
  const failure = await command(fields + 'assert_startup_result ignored request 1.2.3').then(() => null, error => error);
  expect(failure?.stderr).toContain("Pofis sunucusu kapandı (kod: 23)");
  expect(failure?.code).toBe(1);
  await expect(command(fields + 'assert_startup_result ignored other 1.2.3')).rejects.toThrow("açılış sonucu doğrulanamadı");
});

shellTest("macOS temizliği geçici sürümleri kaldırır; bilinmeyen klasörü korur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-mac-cleanup-"));
  try {
    const keep = "a".repeat(32), old = "b".repeat(32);
    // Use shell-native paths on Windows's Git shell too.
    await command('install_root="$2"; mkdir -p "$install_root/versions/$3" "$install_root/versions/$4"; clear_staging_versions; [[ ! -e "$install_root/versions/$3" && ! -e "$install_root/versions/$4" ]]', [directory.replaceAll("\\", "/"), keep, old]);
    await command('install_root="$2"; mkdir "$install_root/versions/unknown"; ! clear_staging_versions; [[ -d "$install_root/versions/unknown" ]]', [directory.replaceAll("\\", "/")]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

shellTest("macOS yeni gerçek app paketini yerleştirir; kayıt yazılamazsa mevcut paketi korur", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-mac-activate-"));
  try {
    const setup = 'install_root="$2"; work="$2/download"; stage="$2/versions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; app_path="$2/Applications/Pofis.app"; mkdir -p "$work" "$stage/Pofis.app" "$app_path"; echo old > "$app_path/version"; echo new > "$stage/Pofis.app/version"; echo manifest > "$work/manifest.json"; ';
    await command(setup + 'activate; [[ "$(cat "$app_path/version")" == new && "$(cat "$stage/previous.app/version")" == old && "$switching" == false ]]; clear_staging_versions; [[ ! -e "$stage" && ! -L "$app_path" ]]', [directory.replaceAll("\\", "/")]);
    // A nonexistent record parent produces a real filesystem failure after the bundle moves.
    await command(setup + 'install_root="$2/missing"; ! activate; [[ "$(cat "$app_path/version")" == old && "$(cat "$stage/Pofis.app/version")" == new ]]', [directory.replaceAll("\\", "/")]);
    const interrupted = await command(setup + 'locked=false; switching=true; mv "$app_path" "$stage/previous.app"; mv "$stage/Pofis.app" "$app_path"; trap cleanup EXIT; exit 143', [directory.replaceAll("\\", "/")]).then(() => null, error => error);
    expect(interrupted?.code).toBe(143);
    expect((await readFile(join(directory, "Applications/Pofis.app/version"), "utf8")).trim()).toBe("old");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

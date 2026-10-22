#!/bin/bash
# Ubuntu 24.04 Desktop supplies Python 3; Node.js and Bun are not needed.
set -euo pipefail
command -v python3 >/dev/null || { printf 'Pofis: Python 3 gerekli.\n' >&2; exit 1; }
pofis_installer="$(mktemp)"
trap 'rm -f -- "$pofis_installer"' EXIT
cat > "$pofis_installer" <<'POFIS_PYTHON'
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request
import uuid

INSTALLER_SOURCE = Path(__file__).read_text(encoding="utf-8")


def fail(message):
    raise RuntimeError(message)


def read_json(path):
    with open(path, encoding="utf-8") as source:
        return json.load(source)


def write_json(path, value):
    atomic_write(path, json.dumps(value, ensure_ascii=False))


def atomic_write(path, value):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        with open(temporary, "x", encoding="utf-8") as output:
            output.write(value)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def version_parts(value):
    if not isinstance(value, str) or not re.fullmatch(r"(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})", value):
        fail("Geçersiz sürüm.")
    return tuple(map(int, value.split(".")))


def validate_manifest(value):
    version_parts(value.get("version"))
    if (value.get("schemaVersion") != 1 or value.get("platform") != "linux" or value.get("arch") != "x64"
            or type(value.get("size")) is not int or not 0 < value["size"] < 2**31
            or not re.fullmatch(r"[a-f0-9]{64}", str(value.get("sha256")))):
        fail("Dağıtım manifesti geçersiz.")
    return value


class Downloads(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, url):
        if urllib.parse.urlsplit(url).scheme != "https":
            fail("İndirme yönlendirmesi HTTPS olmalı.")
        return super().redirect_request(request, fp, code, message, headers, url)


def download(url, destination, expected=None):
    parsed = urllib.parse.urlsplit(url)
    if parsed.username or parsed.password or not (parsed.scheme == "https" or
            parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost")):
        fail("İndirme HTTPS olmalı; yerel testte yalnız loopback HTTP kullanılabilir.")
    limit = expected["size"] if expected else 65536
    digest, size = hashlib.sha256(), 0
    with urllib.request.build_opener(Downloads).open(url, timeout=30) as response, open(destination, "xb") as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            size += len(block)
            if size > limit:
                fail("İndirilen dosya beklenen boyutu aşıyor.")
            digest.update(block)
            output.write(block)
    if expected and (size != limit or digest.hexdigest() != expected["sha256"]):
        fail("Paket boyutu veya SHA-256 değeri eşleşmiyor.")


def package_url(manifest_url, manifest):
    name = f'Pofis-{manifest["version"]}-linux-x64.tar.gz'
    relative = f'{manifest["version"]}/{name}'
    public = f'https://github.com/mertcreates/pofis-landing/releases/download/v{manifest["version"]}/{name}'
    url = manifest.get("url")
    if url == relative:
        return urllib.parse.urljoin(manifest_url, url)
    local = urllib.parse.urlsplit(manifest_url)
    if url == public or (local.scheme == "http" and local.hostname in ("127.0.0.1", "localhost")
                         and url == urllib.parse.urljoin(manifest_url, relative)):
        return url
    fail("Paket adresi beklenen sürümle eşleşmiyor.")


def extract_archive(archive, destination):
    # Validate every member before the first write; our Linux packager dereferences links.
    with tarfile.open(archive, "r:gz") as source:
        members, names, size = source.getmembers(), set(), 0
        for member in members:
            name = member.name.removeprefix("./").rstrip("/")
            if name in ("", ".") and member.isdir():
                continue
            parts = PurePosixPath(name).parts
            normalized = PurePosixPath(name).as_posix()
            if (not parts or name.startswith("/") or ".." in parts or "\\" in name or
                    any(ord(c) < 32 for c in name) or normalized in names or
                    not (member.isfile() or member.isdir())):
                fail("Arşivde güvenli olmayan veya yinelenen dosya var.")
            names.add(normalized)
            size += member.size
            if size > 4 * 1024**3 or len(names) > 100000:
                fail("Açılmış paket sınırı aşıldı.")
        for member in members:
            source.extract(member, destination, filter="data")


def assert_bundle(app, version):
    for name in ("pofis", "chrome-sandbox", "uninstall.sh", "release.json", "resources/app/package.json",
                 "resources/app/electron/main.cjs", "resources/app/electron/server.cjs",
                 "resources/app/electron/server-entry.cjs", "resources/app/electron/startup.cjs",
                 "resources/app/electron/platform.cjs", "resources/app/electron/preload.cjs",
                 "resources/app/electron/transport.cjs",
                 "resources/app/electron/update-bridge.cjs", "resources/app/server/server.js",
                 "resources/app/server/pofis-notifications.cjs", "resources/app/server/.next/BUILD_ID",
                 "resources/app/public/pofi/pofi-mark-256.png"):
        if not (app / name).is_file() or (app / name).is_symlink():
            fail("Paketin gerekli dosyaları eksik.")
    metadata = read_json(app / "release.json")
    if (metadata != dict(schemaVersion=1, version=version, platform="linux", arch="x64") or
            read_json(app / "resources/app/package.json").get("version") != version):
        fail("Paket kimliği, sürümü veya mimarisi eşleşmiyor.")
    with open(app / "pofis", "rb") as binary:
        header = binary.read(20)
    if len(header) != 20 or header[:6] != b"\x7fELF\x02\x01" or header[18:20] != b"\x3e\x00":
        fail("Paket Linux x64 çalıştırılabilir dosyası içermiyor.")
    if not os.access(app / "pofis", os.X_OK):
        fail("Uygulamanın çalıştırma izni eksik.")


def running_pids(app):
    result = []
    prefix = str(app.resolve()) + "/"
    for entry in Path("/proc").iterdir():
        if entry.name.isdigit():
            try:
                executable = os.readlink(entry / "exe").removesuffix(" (deleted)")
            except (FileNotFoundError, PermissionError, ProcessLookupError):
                continue
            if executable.startswith(prefix) and (entry / "status").stat().st_uid == os.getuid():
                result.append(int(entry.name))
    return result


def confirm(message):
    try:
        with open("/dev/tty", "r+") as terminal:
            terminal.write(f"\nPofis · {message}\ne = Devam et / h veya Enter = İptal [e/H] ")
            terminal.flush()
            return terminal.readline().strip().lower() in ("e", "evet")
    except OSError:
        return False


def wait_closed(app, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not running_pids(app):
            return True
        time.sleep(0.2)
    return not running_pids(app)


def close_for_update(app, profile):
    if not running_pids(app):
        return
    if not confirm("Devam etmek için açık Pofis kapanacak."):
        fail("İşlem iptal edildi. Kurulu sürüm aynı kaldı.")
    env = dict(os.environ)
    env.pop("ELECTRON_RUN_AS_NODE", None)
    # The single-instance bridge drains the server before exiting.
    request = subprocess.Popen([str(app / "pofis"), f"--user-data-dir={profile}", "--pofis-quit"],
                               env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        request.wait(timeout=5)
    except subprocess.TimeoutExpired:
        request.terminate()
        request.wait(timeout=5)
    if wait_closed(app):
        return
    if not confirm("Pofis henüz kapanmadı. Zorla kapatılırsa kaydedilmemiş değişiklikler kaybolabilir."):
        fail("İşlem iptal edildi. Pofis'i kapatıp yeniden deneyebilirsin.")
    for pid in running_pids(app):
        # Revalidate ownership and the exact installation immediately before signalling.
        if pid in running_pids(app):
            with contextlib.suppress(ProcessLookupError):
                os.kill(pid, signal.SIGKILL)
    if not wait_closed(app):
        fail("Pofis kapanmadığı için işlem durdu.")


def desktop_entry(app, profile):
    def quote(value):
        # Exec is parsed by the desktop launcher, never by a shell.
        text = str(value).replace("%", "%%").replace("\\", "\\\\").replace('"', '\\"').replace("`", "\\`").replace("$", "\\$")
        return '"' + text + '"'
    return ("[Desktop Entry]\nType=Application\nName=Pofis\nComment=Mesaiye biraz Pofi\n"
            f'Exec={quote(app / "pofis")} {quote("--user-data-dir=" + str(profile))}\n'
            f'Icon={app / "resources/app/public/pofi/pofi-mark-256.png"}\n'
            "Terminal=false\nCategories=Office;\nStartupWMClass=Pofis\n")


def sandbox_profile(executable):
    path = str(executable)
    if re.search(r'[\x00-\x1f"\\*?\[\]{}]', path):
        fail("Kurulum yolu AppArmor profilinde güvenle kullanılamıyor.")
    name = "pofis-" + hashlib.sha256(path.encode()).hexdigest()[:16]
    content = f'abi <abi/4.0>,\ninclude <tunables/global>\nprofile {name} "{path}" flags=(unconfined) {{\n  userns,\n}}\n'
    return name, content


def ensure_sandbox(executable):
    restriction = Path("/proc/sys/kernel/apparmor_restrict_unprivileged_userns")
    if not restriction.exists() or restriction.read_text().strip() != "1":
        return
    name, content = sandbox_profile(executable)
    target = Path("/etc/apparmor.d") / name
    if target.is_file() and target.read_text() == content:
        return
    print("Ubuntu 24.04, Pofis sandbox'ı için uygulamaya özel AppArmor izni istiyor.")
    print(f"Oluşturulacak sistem dosyası: {target}\nİzin yalnız şu dosyaya uygulanır: {executable}")
    if not confirm("Bu izni yönetici parolanla bir kez kurmak istiyor musun?"):
        fail("Sandbox izni kurulmadı. Kurulu uygulama aynı kaldı.")
    with tempfile.TemporaryDirectory(prefix="pofis-apparmor-") as folder:
        source = Path(folder) / name
        source.write_text(content)
        subprocess.run(["sudo", "install", "-o", "root", "-g", "root", "-m", "644", str(source), str(target)], check=True)
        subprocess.run(["sudo", "apparmor_parser", "-r", str(target)], check=True)


def launch(app, profile, version):
    request_id = uuid.uuid4().hex
    receipt = profile / "launch-results" / (request_id + ".json")
    env = dict(os.environ)
    env.pop("ELECTRON_RUN_AS_NODE", None)
    log = profile / "startup.log"
    with open(log, "wb") as output:
        subprocess.Popen([str(app / "pofis"), f"--user-data-dir={profile}", f"--startup-id={request_id}"],
                         env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if receipt.is_file():
            result = read_json(receipt)
            receipt.unlink()
            if (result.get("schemaVersion") != 1 or result.get("requestId") != request_id or
                    result.get("version") != version or result.get("status") != "ready" or result.get("windowReady") is not True or
                    type(result.get("pid")) is not int or result["pid"] not in running_pids(app) or
                    result.get("executable") != str(app / "pofis")):
                fail(result.get("message") or "Pofis açılış sonucu doğrulanamadı.")
            print("Pofis hazır")
            return
        time.sleep(0.2)
    fail(f"Pofis 45 saniyede hazır olmadı. Ayrıntı: {log}")


def canonical_directory(value):
    path = Path(value)
    if not path.is_absolute() or any(ord(c) < 32 for c in str(path)):
        fail("Kurulum yolları mutlak olmalı ve kontrol karakteri içermemeli.")
    # Resolving an existing symlink would silently grant ownership of its target.
    for parent in (path, *path.parents):
        if parent.is_symlink():
            fail("Kurulum yollarında sembolik bağlantı kullanılamaz.")
    return path.resolve()


def transaction_state(root, profile, desktop_dir, manifest, action="install"):
    def previous(path):
        return path.read_text(encoding="utf-8") if path.exists() else None
    return dict(schemaVersion=1, installRoot=str(root), profile=str(profile), desktopDir=str(desktop_dir),
                record=previous(root / "installed.json"),
                shortcut=previous(desktop_dir / "app.pofis.client.desktop"),
                installer=previous(root / "installer.py"), nextVersion=manifest["version"], action=action)


def finish_transaction(root, profile, desktop_dir, rollback=False):
    transaction = root / "transaction"
    if not transaction.exists():
        return
    if transaction.is_symlink() or (transaction / "state.json").is_symlink() or not (transaction / "state.json").is_file():
        fail(f"Yarım kurulumun sahipliği doğrulanamadı. Dosyalar korundu: {transaction}")
    state = read_json(transaction / "state.json")
    if (state.get("schemaVersion") != 1 or state.get("installRoot") != str(root) or
            state.get("profile") != str(profile) or state.get("desktopDir") != str(desktop_dir) or state.get("action") not in ("install", "uninstall") or
            any(state.get(key) is not None and not isinstance(state.get(key), str) for key in ("record", "shortcut", "installer"))):
        fail("Yarım kurulum kaydı seçilen kurulumla eşleşmiyor. Dosyalar korundu.")
    version_parts(state.get("nextVersion"))
    app, backup = root / "app", transaction / "previous"
    if backup.is_symlink() or app.is_symlink():
        fail("Yarım kurulumda beklenmeyen bağlantı var. Dosyalar korundu.")
    shortcut = desktop_dir / "app.pofis.client.desktop"
    if shortcut.is_symlink() or (shortcut.exists() and shortcut.read_text(encoding="utf-8") not in
                                (state["shortcut"], desktop_entry(app, profile))):
        fail("Yarım kurulumdan sonra menü dosyası değişmiş. Dosyalar korundu.")
    old_record = json.loads(state["record"]) if state["record"] is not None else None
    if old_record:
        validate_manifest(old_record)
        if old_record.get("installRoot") != str(root) or old_record.get("profile") != str(profile):
            fail("Önceki kurulum kaydı eşleşmiyor. Dosyalar korundu.")
    committed = (transaction / "committed").is_file() and not rollback
    if backup.exists() and not committed:
        if not old_record:
            fail("Önceki uygulamanın sahipliği doğrulanamadı. Dosyalar korundu.")
        assert_bundle(backup, old_record["version"])
    if committed and state["action"] == "uninstall":
        if not old_record or app.exists():
            fail("Kaldırma kaydı uygulama konumuyla eşleşmiyor. Dosyalar korundu.")
        for path in (root / "installed.json", desktop_dir / "app.pofis.client.desktop", root / "installer.py"):
            if path.is_symlink():
                fail("Kaldırılacak dosya sembolik bağlantı olamaz. Dosyalar korundu.")
            path.unlink(missing_ok=True)
    elif committed:
        current = read_json(root / "installed.json")
        validate_manifest(current)
        if current["version"] != state["nextVersion"]:
            fail("Tamamlanan kurulum kaydı eşleşmiyor. Önceki paket korundu.")
        assert_bundle(app, current["version"])
    else:
        # A missing backup with an old record means the first rename never
        # happened, or a previous rollback already restored the original app.
        replace_candidate = backup.exists() or old_record is None
        if replace_candidate:
            for pid in running_pids(app):
                with contextlib.suppress(ProcessLookupError):
                    os.kill(pid, signal.SIGTERM)
            if not wait_closed(app):
                fail(f"Yeni uygulama kapanmadı. Önceki paket ve toparlanma kaydı korundu: {transaction}")
            if app.exists():
                shutil.rmtree(app)
            if backup.exists():
                backup.rename(app)
        for path, value in ((root / "installed.json", state["record"]),
                            (desktop_dir / "app.pofis.client.desktop", state["shortcut"]),
                            (root / "installer.py", state["installer"])):
            if path.is_symlink():
                fail("Toparlanacak dosya sembolik bağlantı olamaz. Dosyalar korundu.")
            if value is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, value)
        print("Yarım kurulumdan önceki uygulama ve kurulum kayıtları geri alındı.")
    shutil.rmtree(transaction)
    return state["action"] if committed else None


def main(argv=None):
    if sys.platform != "linux" or platform.machine() != "x86_64":
        fail("Bu kurulum Linux x64 içindir.")
    if os.getuid() == 0:
        fail("Komutu sudo kullanmadan kendi hesabında çalıştır.")
    os.umask(0o077)
    data = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share")
    config = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config")
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest-url", default="https://pofis.app/releases/linux/x64/latest.json")
    parser.add_argument("--install-root", default=str(data / "pofis"))
    parser.add_argument("--user-data-dir")
    parser.add_argument("--desktop-dir")
    parser.add_argument("--uninstall", action="store_true")
    args = parser.parse_args(argv)
    root = canonical_directory(args.install_root)
    prior = {}
    if args.uninstall:
        if (root / "installed.json").is_file():
            prior = read_json(root / "installed.json")
        elif (root / "transaction/state.json").is_file():
            prior = read_json(root / "transaction/state.json")
    root, profile, desktop_dir = map(canonical_directory, (str(root),
        args.user_data_dir or prior.get("profile") or str(config / "Pofis"),
        args.desktop_dir or prior.get("desktopDir") or str(data / "applications")))
    for a, b in ((root, profile), (root, desktop_dir), (profile, desktop_dir)):
        if a == b or a in b.parents or b in a.parents:
            fail("Uygulama, profil ve menü dizinleri birbirinden ayrı olmalı.")
    if root in (Path.home(), Path("/")) or len(root.parts) < 4:
        fail("Uygulamaya özel kurulum dizini gerekli.")
    app, record = root / "app", root / "installed.json"
    shortcut = desktop_dir / "app.pofis.client.desktop"
    root.mkdir(parents=True, exist_ok=True)
    if any(p.is_symlink() for p in (app, record, shortcut, root / "install.lock", root / "installer.py")):
        fail("Yönetilen dosyalar sembolik bağlantı olamaz.")
    import fcntl
    # A persistent inode gives automatic crash recovery; never unlink a held flock.
    with open(root / "install.lock", "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            fail("Başka bir Pofis kurulumu çalışıyor.")
        recovered = finish_transaction(root, profile, desktop_dir)
        if args.uninstall and recovered == "uninstall":
            print(f"Yarım kalan kaldırma tamamlandı. Profil korundu: {profile}")
            return
        installed = read_json(record) if record.exists() else None
        if app.exists():
            if not installed or installed.get("installRoot") != str(root) or installed.get("profile") != str(profile):
                fail("Bu konumda kurulumun yönetmediği bir uygulama var; üzerine yazılmadı.")
            validate_manifest(installed)
            assert_bundle(app, installed["version"])
        elif installed:
            fail("Kurulum kaydı var ancak uygulama eksik. Kurulum dizinini kontrol et.")
        if shortcut.exists() and shortcut.read_text() != desktop_entry(app, profile):
            fail("Uygulama menüsü dosyası başka içerik taşıyor; üzerine yazılmadı.")
        if args.uninstall:
            if not installed:
                fail("Kaldırılacak yönetilen Pofis kurulumu bulunamadı.")
            close_for_update(app, profile)
            transaction = root / "transaction"
            transaction.mkdir()
            write_json(transaction / "state.json", transaction_state(root, profile, desktop_dir, installed, action="uninstall"))
            try:
                app.rename(transaction / "previous")
                atomic_write(transaction / "committed", "removed\n")
            except BaseException:
                finish_transaction(root, profile, desktop_dir, rollback=True)
                raise
            finish_transaction(root, profile, desktop_dir)
            print(f"Pofis kaldırıldı. Profil korundu: {profile}")
            return
        profile.mkdir(parents=True, exist_ok=True)
        desktop_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="stage-", dir=root) as folder:
            stage = Path(folder)
            manifest_path = stage / "manifest.json"
            print("Pofis sürümü kontrol ediliyor…")
            download(args.manifest_url, manifest_path)
            manifest = validate_manifest(read_json(manifest_path))
            url = package_url(args.manifest_url, manifest)
            if installed:
                if version_parts(manifest["version"]) < version_parts(installed["version"]):
                    fail("Sürüm düşürülmedi; mevcut kurulum korundu.")
                if manifest["version"] == installed["version"]:
                    if manifest["sha256"] != installed["sha256"]:
                        fail("Aynı sürümün paket içeriği değişmiş. Yeni sürüm gerekli.")
                    launch(app, profile, manifest["version"])
                    print("Pofis güncel")
                    return
            archive, candidate = stage / "package.tar.gz", stage / "app"
            print("Pofis indiriliyor ve doğrulanıyor…")
            download(url, archive, manifest)
            candidate.mkdir()
            extract_archive(archive, candidate)
            assert_bundle(candidate, manifest["version"])
            ensure_sandbox(app / "pofis")
            close_for_update(app, profile)
            transaction = root / "transaction"
            transaction.mkdir()
            write_json(transaction / "state.json", transaction_state(root, profile, desktop_dir, manifest))
            try:
                if app.exists():
                    app.rename(transaction / "previous")
                candidate.rename(app)
                write_json(record, dict(manifest, installRoot=str(root), profile=str(profile), desktopDir=str(desktop_dir)))
                atomic_write(shortcut, desktop_entry(app, profile))
                # Keep the same audited installer for the local uninstall entry point.
                atomic_write(root / "installer.py", INSTALLER_SOURCE)
                launch(app, profile, manifest["version"])
                atomic_write(transaction / "committed", "ready\n")
            except BaseException:
                finish_transaction(root, profile, desktop_dir, rollback=True)
                raise
            finish_transaction(root, profile, desktop_dir)
            print(f'Kurulum tamamlandı · Pofis {manifest["version"]}')


# Read the streamed source once; it is also stored for the local uninstaller.
if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, tarfile.TarError, subprocess.SubprocessError) as error:
        print(f"Pofis: {error}", file=sys.stderr)
        sys.exit(1)
POFIS_PYTHON
python3 "$pofis_installer" "$@"

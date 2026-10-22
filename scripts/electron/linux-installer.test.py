"""Disposable fixtures only; never reaches a production host or user profile."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import tempfile
import types
import unittest
import http.server
import threading
from unittest.mock import patch

SHELL = Path(__file__).with_name("install-linux.sh")
SOURCE = SHELL.read_text(encoding="utf-8").split("<<'POFIS_PYTHON'\n", 1)[1].split("\nPOFIS_PYTHON", 1)[0]
installer = types.ModuleType("pofis_installer")
installer.__file__ = str(SHELL)
exec(compile(SOURCE, str(SHELL), "exec"), installer.__dict__)
REAL_DOWNLOAD = installer.download


def archive_bytes(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        for name, data, kind in entries:
            entry = tarfile.TarInfo(name)
            entry.type = kind
            entry.mode = 0o755 if name in ("pofis", "uninstall.sh") else 0o644
            entry.size = len(data) if kind == tarfile.REGTYPE else 0
            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                entry.linkname = "../../outside"
            archive.addfile(entry, io.BytesIO(data) if entry.isfile() else None)
    return output.getvalue()


def bundle(version, machine=b"\x3e\0", omit=()):
    names = ["chrome-sandbox", "uninstall.sh", "resources/app/electron/main.cjs",
             "resources/app/electron/server.cjs", "resources/app/electron/server-entry.cjs",
             "resources/app/electron/startup.cjs", "resources/app/electron/platform.cjs",
             "resources/app/electron/preload.cjs", "resources/app/electron/update-bridge.cjs", "resources/app/electron/transport.cjs",
             "resources/app/server/server.js", "resources/app/server/pofis-notifications.cjs",
             "resources/app/server/.next/BUILD_ID", "resources/app/public/pofi/pofi-mark-256.png"]
    entries = [(name, b"fixture", tarfile.REGTYPE) for name in names]
    entries += [("pofis", b"\x7fELF\x02\x01" + b"\0" * 12 + machine, tarfile.REGTYPE),
                ("resources/app/package.json", json.dumps({"version": version}).encode(), tarfile.REGTYPE),
                ("release.json", json.dumps(dict(schemaVersion=1, platform="linux", arch="x64", version=version)).encode(), tarfile.REGTYPE)]
    return archive_bytes([entry for entry in entries if entry[0] not in omit])


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="pofis-linux-test-")
        self.base = Path(self.temp.name)
        self.root = self.base / "owned" / "pofis"
        self.profile = self.base / "profile"
        self.desktop = self.base / "applications"
        self.args = ["--install-root", str(self.root), "--user-data-dir", str(self.profile),
                     "--desktop-dir", str(self.desktop), "--manifest-url", "http://127.0.0.1:1234/latest.json"]
        self.version = "1.0.0"
        self.bytes = bundle(self.version)
        self.downloads = []
        fake_fcntl = types.SimpleNamespace(LOCK_EX=2, LOCK_NB=4, flock=lambda *args: None)
        if sys.platform != "linux":
            self.enter(patch.dict(sys.modules, fcntl=fake_fcntl))
        self.enter(patch.object(installer.sys, "platform", "linux"))
        self.enter(patch.object(installer.platform, "machine", return_value="x86_64"))
        self.enter(patch.object(installer.os, "getuid", return_value=1000, create=True))
        self.enter(patch.object(installer.os, "umask", return_value=0o022))
        self.enter(patch.object(installer.signal, "SIGKILL", 9, create=True))
        self.enter(patch.object(installer, "ensure_sandbox"))
        self.launch = self.enter(patch.object(installer, "launch"))
        self.running = self.enter(patch.object(installer, "running_pids", return_value=[]))
        self.enter(patch.object(installer, "download", side_effect=self.download))

    def enter(self, manager):
        value = manager.__enter__()
        self.addCleanup(manager.__exit__, None, None, None)
        return value

    def tearDown(self):
        self.temp.cleanup()

    def manifest(self):
        return dict(schemaVersion=1, platform="linux", arch="x64", version=self.version,
                    size=len(self.bytes), sha256=hashlib.sha256(self.bytes).hexdigest(),
                    url=f"{self.version}/Pofis-{self.version}-linux-x64.tar.gz")

    def download(self, url, destination, expected=None):
        self.downloads.append(url)
        destination.write_bytes(self.bytes if expected else json.dumps(self.manifest()).encode())

    def install(self):
        installer.main(self.args)

    def update(self):
        self.version = "1.0.1"
        self.bytes = bundle(self.version)
        self.install()

    def test_first_install_update_same_version_and_uninstall_preserve_profile(self):
        self.install()
        marker = self.profile / "personal.json"
        marker.write_text("keep me")
        self.assertEqual(installer.read_json(self.root / "installed.json")["version"], "1.0.0")
        self.assertIn(str(self.root / "app/pofis").replace("\\", "\\\\"), (self.desktop / "app.pofis.client.desktop").read_text())
        self.update()
        self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.1")
        count = len(self.downloads)
        self.install()
        self.assertEqual(len(self.downloads), count + 1, "same version must not download the archive")
        installer.main(["--uninstall", "--install-root", str(self.root)])
        self.assertFalse((self.root / "app").exists())
        self.assertFalse((self.desktop / "app.pofis.client.desktop").exists())
        self.assertEqual(marker.read_text(), "keep me")

    def test_failed_new_window_restores_previous_app_manifest_and_shortcut(self):
        self.install()
        original = (self.root / "installed.json").read_bytes()
        self.launch.side_effect = RuntimeError("window failed")
        with self.assertRaisesRegex(RuntimeError, "window failed"):
            self.update()
        self.assertEqual((self.root / "installed.json").read_bytes(), original)
        self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.0")
        self.assertTrue((self.desktop / "app.pofis.client.desktop").exists())

    def interrupted_update(self, phase):
        self.install()
        marker = self.profile / "keep.txt"
        marker.write_text("personal data")
        original = (self.root / "installed.json").read_bytes()
        self.version, self.bytes = "1.0.1", bundle("1.0.1")
        transaction = self.root / "transaction"
        transaction.mkdir()
        installer.write_json(transaction / "state.json",
            installer.transaction_state(self.root, self.profile, self.desktop, self.manifest()))
        if phase != "before-rename":
            (self.root / "app").rename(transaction / "previous")
        if phase in ("candidate", "committed"):
            archive = self.base / "new.tar.gz"
            archive.write_bytes(self.bytes)
            (self.root / "app").mkdir()
            installer.extract_archive(archive, self.root / "app")
            installer.write_json(self.root / "installed.json", dict(self.manifest(), installRoot=str(self.root),
                profile=str(self.profile), desktopDir=str(self.desktop)))
        if phase == "committed":
            installer.atomic_write(transaction / "committed", "ready\n")
        return original, marker

    def test_interrupted_renames_recover_previous_version_without_deleting_profile(self):
        for phase in ("before-rename", "previous-moved", "candidate"):
            with self.subTest(phase=phase):
                if self.root.exists():
                    shutil.rmtree(self.root)
                (self.desktop / "app.pofis.client.desktop").unlink(missing_ok=True)
                self.version, self.bytes = "1.0.0", bundle("1.0.0")
                original, marker = self.interrupted_update(phase)
                installer.finish_transaction(self.root, self.profile, self.desktop)
                self.assertEqual((self.root / "installed.json").read_bytes(), original)
                self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.0")
                self.assertEqual(marker.read_text(), "personal data")
                self.assertFalse((self.root / "transaction").exists())

    def test_completed_transaction_keeps_new_version_and_cleans_previous(self):
        _, marker = self.interrupted_update("committed")
        installer.finish_transaction(self.root, self.profile, self.desktop)
        self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.1")
        self.assertEqual(marker.read_text(), "personal data")
        self.assertFalse((self.root / "transaction").exists())

    def test_interrupted_uninstall_rolls_back_before_commit_and_finishes_after_commit(self):
        self.install()
        marker = self.profile / "keep.txt"
        marker.write_text("personal data")
        transaction = self.root / "transaction"
        transaction.mkdir()
        state = installer.transaction_state(self.root, self.profile, self.desktop, self.manifest(), action="uninstall")
        installer.write_json(transaction / "state.json", state)
        (self.root / "app").rename(transaction / "previous")
        installer.finish_transaction(self.root, self.profile, self.desktop)
        self.assertTrue((self.root / "app/pofis").is_file())
        transaction.mkdir()
        installer.write_json(transaction / "state.json", state)
        (self.root / "app").rename(transaction / "previous")
        installer.atomic_write(transaction / "committed", "removed\n")
        # Resume after part of the committed cleanup was already completed.
        (transaction / "previous/pofis").unlink()
        (self.root / "installed.json").unlink()
        installer.main(["--uninstall", "--install-root", str(self.root)])
        self.assertFalse(transaction.exists())
        self.assertFalse((self.desktop / "app.pofis.client.desktop").exists())
        self.assertEqual(marker.read_text(), "personal data")

    def test_recovery_preserves_user_modified_shortcut_and_backup(self):
        self.interrupted_update("candidate")
        shortcut = self.desktop / "app.pofis.client.desktop"
        shortcut.write_text("user changed this")
        with self.assertRaisesRegex(RuntimeError, "menü dosyası değişmiş"):
            installer.finish_transaction(self.root, self.profile, self.desktop)
        self.assertEqual(shortcut.read_text(), "user changed this")
        self.assertTrue((self.root / "transaction/previous/pofis").exists())

    def test_blocked_rollback_preserves_backup_outside_download_cleanup(self):
        original, marker = self.interrupted_update("candidate")
        with patch.object(installer, "wait_closed", return_value=False), self.assertRaisesRegex(RuntimeError, "korundu"):
            installer.finish_transaction(self.root, self.profile, self.desktop)
        self.assertEqual(installer.read_json(self.root / "transaction/previous/release.json")["version"], "1.0.0")
        self.assertEqual(marker.read_text(), "personal data")
        installer.finish_transaction(self.root, self.profile, self.desktop)
        self.assertEqual((self.root / "installed.json").read_bytes(), original)

    def test_first_rename_failure_preserves_original_app(self):
        self.install()
        original = (self.root / "installed.json").read_bytes()
        rename = Path.rename

        def reject_original(path, destination):
            if path == self.root / "app":
                raise PermissionError("locked original")
            return rename(path, destination)

        with patch.object(Path, "rename", reject_original), self.assertRaisesRegex(PermissionError, "locked original"):
            self.update()
        self.assertEqual((self.root / "installed.json").read_bytes(), original)
        self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.0")

    def test_locked_installation_stops_before_network_or_mutation(self):
        import fcntl
        with patch.object(fcntl, "flock", side_effect=BlockingIOError), self.assertRaisesRegex(RuntimeError, "Başka bir"):
            self.install()
        self.assertEqual(self.downloads, [])
        self.assertFalse((self.root / "app").exists())

    def test_native_flock_releases_after_owner_closes(self):
        import fcntl
        if not isinstance(fcntl, types.ModuleType):
            self.skipTest("Native flock requires Linux; Windows fixture uses the explicit contention test.")
        self.root.mkdir(parents=True)
        with open(self.root / "install.lock", "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(RuntimeError, "Başka bir"):
                self.install()
        self.install()
        self.assertTrue((self.root / "app/pofis").is_file())

    def test_downgrade_and_changed_same_version_do_not_touch_install(self):
        self.install()
        original = (self.root / "installed.json").read_bytes()
        self.bytes += b"changed"
        with self.assertRaisesRegex(RuntimeError, "Aynı sürüm"):
            self.install()
        self.version = "0.9.0"
        with self.assertRaisesRegex(RuntimeError, "düşürülmedi"):
            self.install()
        self.assertEqual((self.root / "installed.json").read_bytes(), original)

    def test_incomplete_or_wrong_architecture_package_cannot_replace_app(self):
        self.install()
        for data, error in (
                (archive_bytes([("readme", b"partial", tarfile.REGTYPE)]), "pofis"),
                (bundle("1.0.1", omit={"resources/app/server/pofis-notifications.cjs"}), "resources/app/server/pofis-notifications"),
                (bundle("1.0.1", b"\xb7\0"), "x64")):
            self.version, self.bytes = "1.0.1", data
            with self.assertRaisesRegex(RuntimeError, error):
                self.install()
            self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.0")
            self.assertEqual(self.launch.call_count, 1, "incomplete packages must not launch")

    def test_cancelled_close_preserves_existing_app(self):
        self.install()
        self.running.return_value = [123]
        with patch.object(installer, "confirm", return_value=False), self.assertRaisesRegex(RuntimeError, "iptal"):
            self.update()
        self.assertEqual(installer.read_json(self.root / "app/release.json")["version"], "1.0.0")

    def test_unknown_app_and_changed_shortcut_are_preserved(self):
        self.install()
        shortcut = self.desktop / "app.pofis.client.desktop"
        shortcut.write_text("user content")
        with self.assertRaisesRegex(RuntimeError, "üzerine yazılmadı"):
            self.update()
        self.assertEqual(shortcut.read_text(), "user content")

    def test_archive_paths_links_duplicates_and_devices_rejected_before_any_write(self):
        cases = [[("../outside", b"x", tarfile.REGTYPE)], [("/absolute", b"x", tarfile.REGTYPE)],
                 [("safe", b"x", tarfile.REGTYPE), ("safe", b"y", tarfile.REGTYPE)],
                 [("link", b"", tarfile.SYMTYPE)], [("link", b"", tarfile.LNKTYPE)],
                 [("device", b"", tarfile.CHRTYPE)]]
        for entries in cases:
            archive, destination = self.base / "bad.tar.gz", self.base / "empty"
            archive.write_bytes(archive_bytes(entries))
            destination.mkdir(exist_ok=True)
            with self.assertRaisesRegex(RuntimeError, "güvenli"):
                installer.extract_archive(archive, destination)
            self.assertEqual(list(destination.iterdir()), [])

    def test_manifest_rejects_invalid_target_size_hash_and_version(self):
        good = self.manifest()
        for invalid in ({"arch": "arm64"}, {"platform": "darwin"}, {"size": True}, {"size": 2**31},
                        {"sha256": "oops"}, {"version": "01.0.0"}):
            with self.assertRaises(RuntimeError):
                installer.validate_manifest(dict(good, **invalid))
        for url in ("https://evil.example/package.tar.gz", "../1.0.0/package.tar.gz"):
            with self.assertRaises(RuntimeError):
                installer.package_url("https://pofis.app/releases/linux/x64/latest.json", dict(good, url=url))

    def test_desktop_exec_and_apparmor_escape_host_paths(self):
        entry = installer.desktop_entry(PurePosixPath('/home/test/a $b/100%/app'), PurePosixPath('/home/test/pro file'))
        self.assertIn('"/home/test/a \\$b/100%%/app/pofis"', entry)
        for path in ('/home/test/*/pofis', '/home/test/"quoted/pofis', '/home/test/\n/pofis'):
            with self.assertRaises(RuntimeError):
                installer.sandbox_profile(Path(path))

    def test_real_loopback_download_detects_truncation_and_corruption(self):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"actual bytes")

            def log_message(self, *args):
                pass

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/archive"
            expected = dict(size=12, sha256=hashlib.sha256(b"actual bytes").hexdigest())
            REAL_DOWNLOAD(url, self.base / "good", expected)
            self.assertEqual((self.base / "good").read_bytes(), b"actual bytes")
            for index, bad in enumerate((dict(expected, size=11), dict(expected, size=13), dict(expected, sha256="a" * 64))):
                with self.assertRaises(RuntimeError):
                    REAL_DOWNLOAD(url, self.base / f"bad-{index}", bad)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_force_close_requires_separate_consent_and_only_targets_owned_pids(self):
        self.running.return_value = [123]
        request = types.SimpleNamespace(wait=lambda **kwargs: 0)
        with patch.object(installer.subprocess, "Popen", return_value=request), \
                patch.object(installer, "wait_closed", side_effect=[False, True]), \
                patch.object(installer, "confirm", side_effect=[True, True]) as consent, \
                patch.object(installer.os, "kill") as kill:
            installer.close_for_update(self.root / "app", self.profile)
            self.assertEqual(consent.call_count, 2)
            kill.assert_called_once_with(123, installer.signal.SIGKILL)


if __name__ == "__main__":
    unittest.main()

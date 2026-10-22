const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

// Ship one self-contained script: no second download or runtime eval. Keep OS
// contracts in their existing source owners and choose before any mutation.
async function unixInstaller(overrides = {}) {
  const [macos, linux] = await Promise.all([
    overrides.darwin ?? readFile(join(__dirname, "install-macos.sh"), "utf8"),
    overrides.linux ?? readFile(join(__dirname, "install-linux.sh"), "utf8"),
  ]);
  const body = text => text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").replace(/^#![^\n]*\n/, "").trimEnd();
  return `#!/bin/bash
# Generated from Pofis's macOS/Linux installer owners. Run without sudo.
case "$(/usr/bin/uname -s)" in
  Darwin)
${body(macos)}
    ;;
  Linux)
${body(linux)}
    ;;
  *) printf 'Pofis: Bu kurulum macOS ve Linux içindir.\\n' >&2; exit 1 ;;
esac
`;
}

module.exports = { unixInstaller };

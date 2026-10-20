#!/bin/bash
set -euo pipefail

intel_bun="$1"
if ! /usr/bin/arch -x86_64 /usr/bin/true; then
  /usr/sbin/softwareupdate --install-rosetta --agree-to-license
fi
archive="$RUNNER_TEMP/pofis-downloads/bun-darwin-x64-1.4.3.zip"
mkdir -p "$(dirname "$archive")"
if [ ! -f "$archive" ]; then
  curl --fail --location --output "$archive" https://github.com/oven-sh/bun/releases/download/bun-v1.4.3/bun-darwin-x64.zip
fi
unzip -q "$archive" -d "$RUNNER_TEMP/pofis-bun-intel"
"$intel_bun" -e 'if (process.platform !== "darwin" || process.arch !== "x64" || Bun.version !== "1.4.3") throw Error("Intel Bun 1.4.3 gerekli")'
"$intel_bun" install --frozen-lockfile

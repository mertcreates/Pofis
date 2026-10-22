const { join } = require("node:path");
const { existsSync } = require("node:fs");

// This loader also runs in the server utility process, without Electron's app API.
const packagedCopy = join(__dirname, "..", "server", "ui-text.cjs");
module.exports = require(existsSync(packagedCopy)
  ? packagedCopy
  : join(__dirname, "..", "src", "lib", "ui-text.js"));

import { cp } from "node:fs/promises";

const build = Bun.spawn(
  [process.execPath, "--bun", "node_modules/next/dist/bin/next", "build"],
  {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
);
const status = await build.exited;
if (status !== 0) process.exit(status);

// Next's standalone server needs these assets beside its generated server.js.
await cp("public", ".next/standalone/public", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });

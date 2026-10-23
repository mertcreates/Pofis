const { appendFile, mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { run } = require("./ci-build.cjs");

async function selectSiteCommit(directory, commit) {
  return commit || run("git", ["rev-parse", "HEAD"], directory);
}

async function checkoutSite() {
  const commit = process.env.SITE_COMMIT;
  if (commit && !/^[a-f0-9]{40}$/.test(commit)) throw new Error("Landing commit'i geçersiz.");
  const directory = join(process.env.RUNNER_TEMP, "pofis-landing");
  await mkdir(directory);
  await run("git", ["init", directory]);
  await run("git", ["remote", "add", "origin", "https://github.com/mertcreates/pofis-landing.git"], directory);
  await run("git", ["fetch", "--depth", "1", "origin", commit || "refs/heads/main"], directory);
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], directory);
  const selected = await selectSiteCommit(directory, commit);
  if (!/^[a-f0-9]{40}$/.test(selected || "")) {
    throw new Error("Landing kaynak commit'i alınamadı.");
  }
  if (!commit) {
    await appendFile(process.env.GITHUB_OUTPUT, `site_commit=${selected}\n`);
  }
  await appendFile(process.env.GITHUB_ENV, `SITE_COMMIT=${selected}\n`);
  await appendFile(process.env.GITHUB_ENV, `SITE_DIRECTORY=${directory}\n`);
}

if (require.main === module) checkoutSite().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { selectSiteCommit };

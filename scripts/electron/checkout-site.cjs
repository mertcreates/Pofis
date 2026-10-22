const { appendFile, mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { run } = require("./ci-build.cjs");
const { assertPublicChanges } = require("./publish.cjs");

async function reviewSiteSource(directory, reviewedCommit) {
  if (!/^[a-f0-9]{40}$/.test(reviewedCommit || "")) throw new Error("İncelenmiş landing kaynak commit'i gerekli.");
  const paths = await run("git", ["diff", "--name-only", reviewedCommit, "HEAD"], directory);
  // Earlier releases may have updated only the six generated public files.
  assertPublicChanges(paths.split(/\r?\n/).filter(Boolean));
  return run("git", ["rev-parse", "HEAD"], directory);
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
  let selected = commit;
  if (!selected) {
    const reviewed = process.env.SITE_REVIEWED_COMMIT;
    if (!/^[a-f0-9]{40}$/.test(reviewed || "")) throw new Error("İncelenmiş landing kaynak commit'i gerekli.");
    await run("git", ["fetch", "--depth", "1", "origin", reviewed], directory);
    selected = await reviewSiteSource(directory, reviewed);
    await appendFile(process.env.GITHUB_OUTPUT, `site_commit=${selected}\n`);
  }
  await appendFile(process.env.GITHUB_ENV, `SITE_COMMIT=${selected}\n`);
  await appendFile(process.env.GITHUB_ENV, `SITE_DIRECTORY=${directory}\n`);
}

if (require.main === module) checkoutSite().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { reviewSiteSource };

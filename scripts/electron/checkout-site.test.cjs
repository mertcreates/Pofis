const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { run } = require("./ci-build.cjs");
const { selectSiteCommit } = require("./checkout-site.cjs");

test("en güncel landing commit'i, public dağıtım dosyaları dışındaki değişikliklerde de seçilir", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pofis-site-source-"));
  const git = args => run("git", args, directory);
  const commit = async () => {
    await git(["add", "."]);
    await git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture"]);
    return git(["rev-parse", "HEAD"]);
  };
  try {
    await git(["init"]);
    await mkdir(join(directory, "src"));
    await writeFile(join(directory, "src/content.ts"), "reviewed source");
    const reviewed = await commit();
    await writeFile(join(directory, "src/content.ts"), "new code");
    const latest = await commit();
    expect(await git(["diff", "--name-only", reviewed, latest])).toBe("src/content.ts");
    expect(await selectSiteCommit(directory)).toBe(latest);
    expect(await selectSiteCommit(directory, reviewed)).toBe(reviewed);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

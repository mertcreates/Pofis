const { test, expect } = require("bun:test");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { run } = require("./ci-build.cjs");
const { reviewSiteSource } = require("./checkout-site.cjs");

test("önceki yayının public dosyaları kabul edilir; değişen landing kodu inceleme ister", async () => {
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
    await mkdir(join(directory, "public"));
    await writeFile(join(directory, "src/content.ts"), "reviewed source");
    const reviewed = await commit();
    expect(await reviewSiteSource(directory, reviewed)).toBe(reviewed);
    await writeFile(join(directory, "public/install.sh"), "generated installer");
    const release = await commit();
    expect(await reviewSiteSource(directory, reviewed)).toBe(release);
    await writeFile(join(directory, "src/content.ts"), "new code");
    await commit();
    await expect(reviewSiteSource(directory, reviewed)).rejects.toThrow("dağıtım kapsamı dışında");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

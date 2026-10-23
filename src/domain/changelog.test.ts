import { expect, test } from "bun:test";
import { compareChangelogVersions, parseChangelog } from "./changelog";

const entry = { version: "0.8.0", publishedOn: "2026-10-23", features: ["Yeni görünüm"] };

test("sürümler sayısal olarak yeniden eskiye sıralanır ve boş gruplar reddedilir", () => {
  expect(compareChangelogVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
  expect(parseChangelog([{ ...entry, features: ["  Yeni görünüm  "] }])[0].features).toEqual(["Yeni görünüm"]);
  for (const value of [[], [entry, entry], [entry, { ...entry, version: "0.9.0" }],
    [{ ...entry, features: [] }], [{ ...entry, features: [" "] }],
    [{ ...entry, features: undefined }], [{ ...entry, version: "00.8.0" }], [{ ...entry, version: "0.8.0\n" }],
    [{ ...entry, version: "9007199254740992.0.0" }]]) {
    expect(() => parseChangelog(value)).toThrow();
  }
});

test("geçerli takvim tarihi gerekir; artık gün yalnız artık yılda kabul edilir", () => {
  expect(parseChangelog([{ ...entry, publishedOn: "2024-02-29" }])[0].publishedOn).toBe("2024-02-29");
  for (const publishedOn of ["2026-02-29", "2026-02-31", "2026-13-01", "2026-00-01", "2026-10-00", "2026-1-01"]) {
    expect(() => parseChangelog([{ ...entry, publishedOn }])).toThrow();
  }
});

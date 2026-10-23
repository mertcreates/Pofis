import rawChangelog from "./changelog.json";
import { parseChangelog } from "@/domain/changelog";

export const changelog = parseChangelog(rawChangelog);

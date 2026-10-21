import { createHash } from "node:crypto";
import { isDateKey } from "../../domain/rules/calendar";
import type { MealPresentation } from "./presentation";
import { mealScenarios } from "./commentary/catalogue";
import { matchingScenarios } from "./commentary/matching";
import type { MealCommentary } from "./commentary/types";

function hash(parts: readonly string[]): number {
  return createHash("sha256").update(JSON.stringify(["pofi-meals:v1", ...parts])).digest().readUInt32BE(0);
}

function index(value: number, length: number): number {
  return ((value % length) + length) % length;
}

/** Server selection; account keys and the full catalogue stay outside the client response. */
export function getMealPofiCommentary(
  meal: MealPresentation,
  { date, accountKey }: { date: string; accountKey: string },
): MealCommentary | null {
  if (!isDateKey(date)) throw new RangeError("Invalid meal commentary date");
  if (typeof accountKey !== "string" || !accountKey.trim()) throw new Error("Missing Pofi account key");
  const candidates = matchingScenarios(meal, mealScenarios);
  if (!candidates.length) return null;

  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const dishes = candidates.filter((scenario) => scenario.kind === "dish");
  const mainDishes = meal.kind === "structured"
    ? matchingScenarios({ ...meal, sides: [] }, dishes)
    : [];
  const priorities = [
    candidates.filter((scenario) => scenario.kind === "pair"),
    mainDishes,
    dishes.filter((scenario) => scenario.requires[0].food !== "drink"),
    dishes,
  ];
  const eligible = priorities.find((pool) => pool.length) ?? candidates;

  // Rank stable IDs so rearranging content files doesn't change the chosen scenario.
  const scenario = eligible.reduce((best, item) => {
    const rank = hash([accountKey, date, item.id]);
    const bestRank = hash([accountKey, date, best.id]);
    return rank > bestRank || (rank === bestRank && item.id < best.id) ? item : best;
  });
  const variant = index(day + hash([accountKey, scenario.id, "variant"]), scenario.variants.length);
  return {
    id: `meal:${scenario.id}:v${variant + 1}`,
    scenario: scenario.id,
    kind: scenario.kind,
    text: scenario.variants[variant],
  };
}

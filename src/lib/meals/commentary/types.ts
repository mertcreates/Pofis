import type { MealSideKind } from "../presentation";
import type { FoodId } from "./foods";

export type MealRole = MealSideKind | "main" | "vegetarian";
export type FoodReference = { food: FoodId; role?: MealRole };
export type NoteVariants = readonly [string, string] | readonly [string, string, string];
export type SceneCondition = "menu" | "source" | "alternatives" | "single-main" | "shared-side" | "soup";

type ScenarioContent = {
  id: string;
  variants: NoteVariants;
};

export type MealScenario = ScenarioContent & (
  | { kind: "pair"; requires: readonly [FoodReference, FoodReference, ...FoodReference[]] }
  | { kind: "dish"; requires: readonly [FoodReference] }
  | { kind: "scene"; when: SceneCondition }
);

export interface MealCommentary {
  id: string;
  scenario: string;
  kind: MealScenario["kind"];
  text: string;
}

import { pairScenarios } from "./pairs";
import { dishScenarios } from "./dishes";
import { sceneScenarios } from "./scenes";
import type { MealScenario } from "./types";

export const mealScenarios: readonly MealScenario[] = [
  ...pairScenarios,
  ...dishScenarios,
  ...sceneScenarios,
];

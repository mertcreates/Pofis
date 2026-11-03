import { ui } from "./ui-text.js";
import { emptyWorkPlans, readWorkPlans, WorkPlansValidationError } from "../domain/rules/work-plan";

export const PLAN_STORAGE_KEY = "pofis:work-plans:v1";

/** @param {Pick<Storage, 'getItem'>} storage */
export function loadPlans(storage) {
  const stored = storage.getItem(PLAN_STORAGE_KEY);
  return stored === null ? emptyWorkPlans() : readStoredPlans(stored);
}

/** @param {Pick<Storage, 'setItem'>} storage
 * @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function savePlans(storage, plans) {
  storage.setItem(PLAN_STORAGE_KEY, serializePlans(plans));
}

/** @param {string} raw
 * @returns {import('../domain/rules/work-plan').WorkPlans} */
export function readStoredPlans(raw) {
  const value = JSON.parse(raw);
  try {
    return readWorkPlans(value);
  } catch (error) {
    if (error instanceof WorkPlansValidationError) throw new Error(ui.planStorageErrors[error.issue]);
    throw error;
  }
}

/** @param {import('../domain/rules/work-plan').WorkPlans} plans */
export function serializePlans(plans) {
  return JSON.stringify(readStoredPlans(JSON.stringify(plans)));
}

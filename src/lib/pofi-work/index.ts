import { createPofiWorkCatalogue } from "./catalogue";
import { WINDOW_NOTES } from "./pools/window.js";
import { BREAK_NOTES } from "./pools/break.js";
import { COMPANY_NOTES } from "./pools/company.js";
import { LINKED_WORK_DAYS } from "./linked.js";

export const pofiWork = createPofiWorkCatalogue({
  pools: { window: WINDOW_NOTES, break: BREAK_NOTES, company: COMPANY_NOTES },
  linked: LINKED_WORK_DAYS,
});

import { createNoteCatalogue } from "./catalogue";
import { createPofiNotebook } from "./notebook";
import { SPECIAL_DAYS } from "./special-days";
import { POFI_NOTE_THEMES } from "./themes/index.js";
import { POFI_SPECIAL_NOTES } from "./specials.js";

export const pofiNoteCatalogue = createNoteCatalogue({
  themes: POFI_NOTE_THEMES,
  specials: POFI_SPECIAL_NOTES,
});
export const pofiNotebook = createPofiNotebook(
  pofiNoteCatalogue,
  SPECIAL_DAYS,
);

import { createNoteCatalogue } from "./catalogue";
import { createPofiNotebook } from "./notebook";
import { NOTE_PUBLICATIONS } from "./publications";
import { POFI_NOTE_THEMES } from "./themes/index.js";
import { POFI_SPECIAL_NOTES } from "./specials.js";

export const pofiNoteCatalogue = createNoteCatalogue({
  themes: POFI_NOTE_THEMES,
  specials: POFI_SPECIAL_NOTES,
});
export const pofiNotebook = createPofiNotebook(
  pofiNoteCatalogue,
  NOTE_PUBLICATIONS,
);

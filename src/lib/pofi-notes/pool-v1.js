// Pool order is part of deterministic daily selection.
const themeIds = [
  "chair",
  "sticky-note",
  "drawer",
  "headphones",
  "file-name",
  "water-glass",
  "desk-lamp",
  "door",
  "paperclips",
  "office-silence",
  "wall-clock",
  "umbrella",
  "computer",
  "coffee",
  "meeting",
  "elevator",
  "desk",
  "todo",
  "lunch",
  "plant",
];
const buildThemePool = (themeIds) =>
  Array.from({ length: 64 }, (_, variant) =>
    themeIds.map(
      (theme) =>
        `${theme}:i${Math.floor(variant / 16) + 1}:d${(Math.floor(variant / 4) % 4) + 1}:e${(variant % 4) + 1}`,
    ),
  ).flat();
export const POFI_NOTE_POOL_V1 = buildThemePool(themeIds);

export const POFI_SPECIAL_VARIANTS_V1 = ["v1", "v2", "v3", "v4"];

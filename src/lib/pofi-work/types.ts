export type PofiWorkDay = {
  readonly id: string;
  readonly window: string;
  readonly break: string;
  readonly company: string;
};

export type PofiWorkCategory = "window" | "break" | "company";
export type PofiWorkEntry = { readonly id: string; readonly text: string };
export type PofiWorkContent = {
  readonly pools: Readonly<Record<PofiWorkCategory, readonly PofiWorkEntry[]>>;
  readonly linked: readonly PofiWorkDay[];
};

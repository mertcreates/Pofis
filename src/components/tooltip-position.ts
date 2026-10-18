type Rect = { left: number; top: number; width: number; height: number };

export function tooltipPosition(anchor: Rect, tip: { width: number; height: number }, viewport: { width: number; height: number }) {
  const margin = 8;
  const gap = 8;
  const center = anchor.left + anchor.width / 2;
  const above = anchor.top - gap - margin;
  const below = viewport.height - (anchor.top + anchor.height) - gap - margin;
  const side = above >= tip.height || above >= below ? "top" : "bottom";
  const clamp = (value: number, maximum: number) => Math.max(margin, Math.min(value, maximum - margin));
  const left = clamp(center - tip.width / 2, viewport.width - tip.width);
  const top = clamp(side === "top" ? anchor.top - gap - tip.height : anchor.top + anchor.height + gap, viewport.height - tip.height);
  return { left, top, side };
}

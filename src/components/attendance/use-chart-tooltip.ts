import { useEffect, useRef } from "react";

export function useChartTooltip(liveDate: string | undefined) {
  const column = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anchor = column.current;
    const tip = anchor?.querySelector<HTMLElement>(".chart-tooltip");
    if (!liveDate || !anchor || !tip) return;
    const dismiss = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        getComputedStyle(tip).visibility === "visible"
      )
        anchor.dataset.tooltipDismissed = "true";
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
    };
  }, [liveDate]);
  return column;
}

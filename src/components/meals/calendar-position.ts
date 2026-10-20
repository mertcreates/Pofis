interface CalendarTriggerPosition {
  left: number;
  top: number;
  bottom: number;
}

interface CalendarSize {
  width: number;
  height: number;
}

interface CalendarViewport {
  width: number;
  height: number;
}

export function getMealCalendarHeight(calendar: Pick<HTMLElement, "offsetHeight" | "scrollHeight" | "clientHeight">) {
  return calendar.offsetHeight + calendar.scrollHeight - calendar.clientHeight;
}

export function getMealCalendarPosition(
  trigger: CalendarTriggerPosition,
  calendar: CalendarSize,
  viewport: CalendarViewport,
) {
  const horizontalSpace = viewport.width - calendar.width;
  const horizontalGutter = Math.max(4, Math.min(12, horizontalSpace / 2));
  const left = Math.max(horizontalGutter, Math.min(trigger.left, horizontalSpace - horizontalGutter));
  const verticalGutter = 12;
  const gap = 8;
  const spaceAbove = Math.max(0, trigger.top - gap - verticalGutter);
  const spaceBelow = Math.max(0, viewport.height - trigger.bottom - gap - verticalGutter);
  const placeAbove = calendar.height > spaceBelow && spaceAbove > spaceBelow;
  const availableHeight = placeAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(1, Math.min(calendar.height, availableHeight, viewport.height - verticalGutter * 2));
  const top = placeAbove
    ? trigger.top - maxHeight - gap
    : Math.min(trigger.bottom + gap, viewport.height - maxHeight - verticalGutter);

  return { top, left, maxHeight };
}

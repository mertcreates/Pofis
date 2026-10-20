import { dailyDurationState, dailyRecordState } from "./duration.js";
import { passageDay } from "./passages.js";
import { ui } from "../../lib/ui-text.js";

const POFI_THRESHOLDS = Object.freeze({
  tired: 80,
  overworked: 115,
});

export const POFI_ASSETS = Object.freeze({
  idle: "/pofi/states/idle.webp",
  working: "/pofi/states/working.webp",
  break: "/pofi/states/break.webp",
  tired: "/pofi/states/tired.webp",
  completed: "/pofi/states/completed.webp",
  overworked: "/pofi/states/overworked.webp",
  error: "/pofi/states/error.webp",
});

const pofiStates = Object.freeze(
  Object.fromEntries(
    Object.entries(ui.pofi.states).map(([state, copy]) => [
      state,
      Object.freeze({
        state,
        asset: POFI_ASSETS[state] ?? POFI_ASSETS.idle,
        ...copy,
      }),
    ]),
  ),
);

function stateForProgress(progress, { isOpen = false } = {}) {
  if (!progress || !Number.isFinite(progress.percentage)) {
    return isOpen ? "working" : "idle";
  }
  const { percentage, remaining } = progress;
  if (remaining === 0) {
    if (percentage >= POFI_THRESHOLDS.overworked) return "overworked";
    return isOpen ? "working" : "completed";
  }
  if (percentage >= POFI_THRESHOLDS.tired) {
    return "tired";
  }
  return "working";
}

function resolveBreakContext({ passages, day, today, isToday }) {
  if (!Array.isArray(passages) || !day?.date) {
    return { uncertain: false, onBreak: false };
  }
  const passage = passageDay(passages, day.date, today ?? day.date);
  if (passage.uncertain && !(isToday && passage.hasReliableOpenEntry)) {
    return { uncertain: true, onBreak: false };
  }
  const onBreak =
    Boolean(isToday) &&
    passage.openEntry === null &&
    passage.intervals.length > 0;
  return { uncertain: false, onBreak };
}

/**
 * @param {string} state
 * @param {Partial<{state: string, asset: string, title: string, message: string, percentage: number, basis: 'recorded' | 'live', badge: string}>} overrides
 * @returns {{state: string, asset: string, title: string, message: string, percentage?: number, basis?: 'recorded' | 'live', badge: string}}
 */
function buildResult(state, overrides = {}) {
  const base = pofiStates[state] ?? pofiStates.idle;
  return {
    ...base,
    percentage: undefined,
    basis: undefined,
    badge: ui.awaitingEntry,
    ...overrides,
  };
}

export function pofiNote({
  day,
  dailySeconds,
  workingDay,
  isToday,
  now,
  passages,
  today,
  stale = false,
}) {
  const record = dailyRecordState(day);
  const breakContext = resolveBreakContext({ passages, day, today, isToday });

  if (
    record === "uncertain" ||
    (!isToday && record === "open") ||
    breakContext.uncertain
  ) {
    return buildResult("error", { badge: ui.incompleteRecord });
  }

  if (!workingDay) {
    return buildResult("idle", {
      badge: ui.nonWorkingDay,
      title: ui.pofi.nonWorkingTitle,
      message: ui.pofi.nonWorking,
    });
  }

  if (record === "empty") {
    return buildResult("idle", { badge: ui.awaitingEntry });
  }

  const progress = dailyDurationState({
    day,
    dailySeconds,
    isToday,
    now,
    stale,
    passages,
  });

  if (progress?.basis === "recorded") {
    const { percentage, remaining } = progress;
    const badge = `%${percentage}`;

    if (remaining === 0) {
      const state = stateForProgress(progress, { isOpen: false });
      return buildResult(state, {
        percentage,
        basis: "recorded",
        badge,
        message: pofiStates[state].message,
      });
    }

    if (breakContext.onBreak) {
      return buildResult("break", {
        percentage,
        basis: "recorded",
        badge,
      });
    }

    const state = stateForProgress(progress, { isOpen: false });
    return buildResult(state, {
      percentage,
      basis: "recorded",
      badge,
      message: pofiStates[state].message,
    });
  }

  if (progress?.basis === "live") {
    const { percentage, remaining } = progress;
    const state = stateForProgress(progress, { isOpen: true });
    const badge = `%${percentage}`;

    if (remaining === 0 && state === "working") {
      return buildResult(state, {
        percentage,
        basis: "live",
        badge,
        title: "",
        message: ui.pofi.staying,
      });
    }

    return buildResult(state, {
      percentage,
      basis: "live",
      badge,
      message: pofiStates[state].message,
    });
  }

  return buildResult("working", { badge: ui.mesaiOngoing });
}

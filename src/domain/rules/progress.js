export function targetProgress(seconds, target) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !Number.isFinite(target) ||
    target < 0
  )
    return null;
  // Carryover can fulfill the last working day's target before entry.
  if (target === 0) return { percentage: 100, remaining: 0 };
  const ratio = (100 * seconds) / target;
  let percentage = Math.floor(ratio);
  if (seconds >= target) percentage = Math.round(ratio);
  return {
    percentage,
    remaining: Math.max(0, target - seconds),
  };
}

export function percentage(seconds, target) {
  return targetProgress(seconds, target)?.percentage ?? null;
}

const CHART_SCALE = Object.freeze({
  minimumSeconds: 10 * 3600,
  stepSeconds: 2 * 3600,
});
export function chartMaximum(durations) {
  return (
    Math.ceil(
      Math.max(
        CHART_SCALE.minimumSeconds,
        ...durations,
      ) / CHART_SCALE.stepSeconds,
    ) * CHART_SCALE.stepSeconds
  );
}

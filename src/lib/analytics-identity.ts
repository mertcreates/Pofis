export function isAnalyticsUserId(value: unknown): value is string {
  return typeof value === "string" && /^pofis_ga_v1_[a-f0-9]{64}$/.test(value);
}

export function readAnalyticsUserId(report: unknown): string | null {
  if (!report || typeof report !== "object" || !("analyticsUserId" in report)) return null;
  return isAnalyticsUserId(report.analyticsUserId) ? report.analyticsUserId : null;
}

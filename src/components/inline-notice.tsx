import type { ReactNode } from "react";

export function InlineNotice({ children, tone = "info" }: {
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return <div className={`inline-notice inline-notice-${tone}`} role={tone === "warning" ? "alert" : "status"}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {tone === "warning" ? <path d="M12 7v6m0 3v1" /> : <path d="M12 10v7m0-10v1" />}
    </svg>
    <div>{children}</div>
  </div>;
}

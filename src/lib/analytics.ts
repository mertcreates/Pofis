import { version } from "../../package.json";
import { isAnalyticsUserId } from "./analytics-identity";

export const MEASUREMENT_ID = "G-MV4MG71CDB";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    pofisAnalyticsUserId?: string | null;
  }
}

export function setAnalyticsUserId(value: string | null) {
  const userId = isAnalyticsUserId(value) ? value : null;
  if (window.pofisAnalyticsUserId === userId) return;
  window.pofisAnalyticsUserId = userId;
  // Keep the pending identity if the report arrives before the tag initializes.
  window.gtag?.("set", { user_id: userId });
  if (userId) window.gtag?.("event", "account_identified", { app_release: version });
}

export function trackPageView(pathname: string) {
  if (pathname !== "/") setAnalyticsUserId(null);
  const path = pathname === "/" ? "/app" : pathname === "/demo" ? "/demo" : "/other";
  const page = {
    page_location: `https://pofis.app${path}`,
    page_title: path === "/demo" ? "Pofis Demo" : "Pofis",
    page_referrer: "",
    app_release: version,
  };

  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    window.gtag("js", new Date());
    // Automatic engagement events also use the sanitized page context.
    window.gtag("set", {
      ...page,
      ...(window.pofisAnalyticsUserId ? { user_id: window.pofisAnalyticsUserId } : {}),
    });
    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      cookie_domain: "none",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  } else {
    window.gtag("set", page);
  }
  window.gtag("event", "page_view", page);
}

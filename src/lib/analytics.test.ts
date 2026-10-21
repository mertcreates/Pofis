import { afterEach, expect, test } from "bun:test";
import { MEASUREMENT_ID, trackPageView, setAnalyticsUserId } from "./analytics";
import { readAnalyticsUserId } from "./analytics-identity";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

test("identity arriving before initialization is attached without exposing an event property", () => {
  const commands = browser();
  const userId = `pofis_ga_v1_${"a".repeat(64)}`;
  setAnalyticsUserId(userId);
  trackPageView("/");
  expect(commands()[1]).toEqual(["set", expect.objectContaining({ user_id: userId })]);
  expect(commands().at(-1)?.[2]).not.toHaveProperty("user_id");
});

test("account changes identify each account once and sign-out clears it without another pageview", () => {
  const commands = browser();
  trackPageView("/");
  const a = `pofis_ga_v1_${"a".repeat(64)}`;
  const b = `pofis_ga_v1_${"b".repeat(64)}`;
  setAnalyticsUserId(a);
  setAnalyticsUserId(a);
  setAnalyticsUserId(null);
  setAnalyticsUserId(b);
  setAnalyticsUserId(null);
  expect(commands().filter(command => command[0] === "set" && "user_id" in (command[1] as object))).toEqual([
    ["set", { user_id: a }], ["set", { user_id: null }],
    ["set", { user_id: b }], ["set", { user_id: null }],
  ]);
  expect(commands().filter(command => command[1] === "page_view")).toHaveLength(1);
  expect(commands().filter(command => command[1] === "account_identified")).toHaveLength(2);
  expect(commands().filter(command => command[0] === "config")).toHaveLength(1);
});

test("demo navigation clears an authenticated identity", () => {
  const commands = browser();
  trackPageView("/");
  setAnalyticsUserId(`pofis_ga_v1_${"a".repeat(64)}`);
  trackPageView("/demo");
  expect(window.pofisAnalyticsUserId).toBeNull();
  expect(commands()).toContainEqual(["set", { user_id: null }]);
});

test.each([undefined, null, "", "Mert Ercan", "private@example.com", "self", "a".repeat(64), 123])(
  "only the scoped analytics ID can be used as user_id: %s", value => {
    browser();
    expect(readAnalyticsUserId({ analyticsUserId: value })).toBeNull();
    setAnalyticsUserId(value as string);
    expect(window.pofisAnalyticsUserId).toBeNull();
  },
);

test("report identity reader accepts a derived ID without using the person's name or ID", () => {
  const userId = `pofis_ga_v1_${"a".repeat(64)}`;
  expect(readAnalyticsUserId({ analyticsUserId: userId, person: { id: "self", name: "Private Name" } })).toBe(userId);
  expect(readAnalyticsUserId({ person: { id: "self", name: "Private Name" } })).toBeNull();
});

function browser() {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { href: "http://127.0.0.1:3210/?email=private@example.com#secret" },
    document: { title: "Özel kişi adı", referrer: "https://internal.example/person/123" },
  } });
  return () => window.dataLayer!.map(command => Array.from(command as ArrayLike<unknown>));
}

test("initializes one tag and sends one sanitized pageview per navigation", () => {
  const commands = browser();
  trackPageView("/");
  trackPageView("/demo");
  trackPageView("/");
  expect(commands().filter(command => command[0] === "config")).toEqual([
    ["config", MEASUREMENT_ID, {
      send_page_view: false, cookie_domain: "none",
      allow_google_signals: false, allow_ad_personalization_signals: false,
    }],
  ]);
  expect(commands().filter(command => command[0] === "event")).toEqual([
    ["event", "page_view", { page_location: "https://pofis.app/app", page_title: "Pofis", page_referrer: "", app_release: expect.any(String) }],
    ["event", "page_view", { page_location: "https://pofis.app/demo", page_title: "Pofis Demo", page_referrer: "", app_release: expect.any(String) }],
    ["event", "page_view", { page_location: "https://pofis.app/app", page_title: "Pofis", page_referrer: "", app_release: expect.any(String) }],
  ]);
  expect(commands()[1]).toEqual(["set", {
    page_location: "https://pofis.app/app", page_title: "Pofis", page_referrer: "", app_release: expect.any(String),
  }]);
});

test("unknown paths, query strings and personal page metadata stay outside analytics fields", () => {
  const commands = browser();
  trackPageView("/person/private@example.com");
  expect(commands().at(-1)).toEqual(["event", "page_view", {
    page_location: "https://pofis.app/other", page_title: "Pofis", page_referrer: "", app_release: expect.any(String),
  }]);
  const payload = JSON.stringify(commands());
  for (const secret of ["private@example.com", "secret", "Özel kişi adı", "internal.example", "127.0.0.1"]) {
    expect(payload).not.toContain(secret);
  }
});

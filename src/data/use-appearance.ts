"use client";
import { useEffect, useRef, useState } from "react";
import { THEME_STORAGE_KEY, themePreference } from "@/lib/theme.js";

export function useAppearance() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const preference = useRef("system");
  useEffect(() => {
    if (ready) document.documentElement.dataset.theme = theme;
  }, [theme, ready]);
  useEffect(() => {
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      setTheme(
        preference.current === "dark" ||
          (preference.current === "system" && scheme.matches)
          ? "dark"
          : "light",
      );
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      // Retain the preview's saved appearance when importing the archive contract.
      const legacy =
        stored === null
          ? JSON.parse(localStorage.getItem("pofis:preferences:v1") ?? "null")
          : null;
      preference.current = themePreference(stored ?? legacy?.theme);
    } catch {
      setError("Görünüm tercihin okunamadı.");
    }
    apply();
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        preference.current = themePreference(event.newValue);
        apply();
      }
    };
    scheme.addEventListener("change", apply);
    window.addEventListener("storage", sync);
    return () => {
      scheme.removeEventListener("change", apply);
      window.removeEventListener("storage", sync);
    };
  }, []);
  function save(next: "light" | "dark") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      preference.current = next;
      setTheme(next);
      setError("");
      return true;
    } catch {
      setError("Görünüm tercihin kaydedilemedi.");
      return false;
    }
  }
  return { theme, ready, error, save };
}

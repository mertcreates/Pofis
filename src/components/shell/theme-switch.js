"use client";
import { Moon, Sun } from "lucide-react";
import { ui } from "@/lib/ui-text.js";
export default function ThemeSwitch({ label, theme, ready, onToggle }) {
  const dark = theme === "dark";
  const CurrentIcon = dark ? Moon : Sun;
  const action = dark ? ui.theme.switchToLight : ui.theme.switchToDark;
  return (
    <button
      className={label ? "theme-switch theme-switch-labeled" : "theme-switch"}
      type="button"
      aria-label={action}
      title={action}
      onClick={onToggle}
      disabled={!ready}
    >
      {label && <span>{label}</span>}
      <CurrentIcon size={19} aria-hidden="true" />
    </button>
  );
}
